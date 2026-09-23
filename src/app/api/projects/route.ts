import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { locateProperty } from "@/lib/pipeline/locate";
import { ALGORITHM_VERSION } from "@/lib/constants";

export const maxDuration = 60;

const schema = z.object({
  street: z.string().min(3).max(120),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(2),
  zip: z.string().max(10).optional().nullable(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  if (parsed.data.state.toUpperCase() !== "MD") {
    return NextResponse.json({ error: "v0.1 only supports Maryland (MD) addresses." }, { status: 400 });
  }
  const located = await locateProperty({
    street: parsed.data.street, city: parsed.data.city, state: "MD", zip: parsed.data.zip || undefined,
  });
  if (!located.ok || !located.geocode) {
    return NextResponse.json({ error: located.ok ? "Geocode failed" : located.error, logs: located.logs }, { status: 422 });
  }
  const g = located.geocode;
  const project = await prisma.project.create({
    data: {
      organizationId: user.organizationId,
      createdById: user.id,
      name: g.matchedAddress,
      status: located.buildings.length === 0 ? "needs_review" : "needs_building_selection",
      coverage: located.coverage,
      algorithmVersion: ALGORITHM_VERSION,
      property: {
        create: {
          street: parsed.data.street, city: parsed.data.city, state: "MD",
          zip: parsed.data.zip || g.zip || "", normalizedAddress: g.matchedAddress,
          county: located.jurisdiction.name, jurisdictionCode: located.parcel?.jurisdictionCode,
          latitude: g.lat, longitude: g.lon, geocodeProvider: g.provider,
          geocodeQuality: g.quality, geocodeConfidence: g.confidence,
          geocodeMetadata: JSON.stringify(g.metadata),
          parcelId: located.parcel?.parcelId, parcelSource: located.parcel?.provider,
          parcelGeometry: located.parcel?.geometry ? JSON.stringify(located.parcel.geometry) : null,
          parcelMetadata: located.parcel ? JSON.stringify(located.parcel.metadata) : null,
          buildings: {
            create: located.buildings.map((b, i) => ({
              source: b.source, sourceId: b.sourceId, geometry: JSON.stringify(b.geometry),
              footprintAreaSqFt: b.footprintAreaSqFt, centroidLat: b.centroidLat, centroidLon: b.centroidLon,
              distanceToAddressM: b.distanceToAddressM, rankScore: b.rankScore, rankReason: b.rankReason,
              isPrimaryCandidate: i === 0, selected: false,
            })),
          },
        },
      },
      jobs: { create: { createdById: user.id, status: "complete", stage: "footprint_retrieved", progress: 40, log: JSON.stringify(located.logs), finishedAt: new Date() } },
      audits: { create: { userId: user.id, action: "project.created", detail: g.matchedAddress } },
    },
  });
  return NextResponse.json({ id: project.id, logs: located.logs });
}
