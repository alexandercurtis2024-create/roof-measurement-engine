import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { workerAuthorized } from "@/lib/worker-auth";

function centroidOf(geomJson: string | null, fallbackLon: number | null, fallbackLat: number | null) {
  if (!geomJson) return { lon: fallbackLon, lat: fallbackLat };
  try {
    const g = JSON.parse(geomJson);
    const coords = g.coordinates || g.geometry?.coordinates;
    const ring = Array.isArray(coords?.[0]?.[0]?.[0]) ? coords[0][0] : Array.isArray(coords?.[0]?.[0]) ? coords[0] : coords;
    if (!Array.isArray(ring) || ring.length < 3) return { lon: fallbackLon, lat: fallbackLat };
    let sx = 0, sy = 0, n = 0;
    for (const pt of ring) {
      if (!Array.isArray(pt) || pt.length < 2) continue;
      sx += Number(pt[0]); sy += Number(pt[1]); n += 1;
    }
    if (!n) return { lon: fallbackLon, lat: fallbackLat };
    return { lon: sx / n, lat: sy / n };
  } catch {
    return { lon: fallbackLon, lat: fallbackLat };
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!workerAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const claimed = await prisma.processingJob.updateMany({
    where: { id, status: { in: ["queued", "claimed", "failed"] } },
    data: { status: "claimed", stage: "claimed", startedAt: new Date(), progress: 5 },
  });
  if (claimed.count !== 1) return NextResponse.json({ error: "not_claimable" }, { status: 409 });
  const job = await prisma.processingJob.findUnique({
    where: { id },
    include: { project: { include: { property: { include: { buildings: true } } } } },
  });
  if (!job?.project.property) return NextResponse.json({ error: "no_property" }, { status: 422 });
  const p = job.project.property;
  const selected = p.buildings.find((b) => b.selected) || p.buildings[0];
  const c = centroidOf(selected?.geometry || null, p.longitude, p.latitude);
  return NextResponse.json({
    id: job.id,
    lon: c.lon,
    lat: c.lat,
    address: p.normalizedAddress,
    buildingId: selected?.id || null,
    engine: "v1.0.0-cand",
  });
}
