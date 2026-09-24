import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { analyzeBuilding } from "@/lib/pipeline/analyze";
import type { Feature, Polygon } from "geojson";
import { ALGORITHM_VERSION } from "@/lib/constants";
import { dispatchLidarJob } from "@/lib/lidar/dispatch";

export const maxDuration = 60;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const buildingId = String(body.buildingId || "");
  const pitchRise = body.pitchRise ?? null;
  const waste = body.waste ?? null;

  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { property: { include: { buildings: true } } },
  });
  if (!project?.property) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const building = project.property.buildings.find((b) => b.id === buildingId);
  if (!building) return NextResponse.json({ error: "Building not found" }, { status: 404 });

  await prisma.building.updateMany({ where: { propertyId: project.property.id }, data: { selected: false } });
  await prisma.building.update({ where: { id: building.id }, data: { selected: true } });
  await prisma.property.update({ where: { id: project.property.id }, data: { selectedBuildingId: building.id } });

  const geom = JSON.parse(building.geometry) as Feature<Polygon>;
  const analysis = await analyzeBuilding({
    footprint: geom, sourceName: building.source, sourceNotes: building.rankReason || building.source,
    pitchRiseManual: pitchRise, wasteOverride: waste,
  });

  await prisma.measurement.deleteMany({ where: { projectId: project.id } });
  await prisma.roofModel.deleteMany({ where: { projectId: project.id } });

  const model = await prisma.roofModel.create({
    data: {
      projectId: project.id, algorithmVersion: ALGORITHM_VERSION, method: analysis.engine.method,
      sourceSummary: building.source, footprintAreaSqFt: analysis.engine.footprintAreaSqFt,
      surfaceAreaSqFt: analysis.engine.surfaceAreaSqFt, squares: analysis.engine.squares,
      complexityClass: analysis.engine.complexityClass, complexityReason: analysis.engine.complexityReason,
      wasteRecommended: analysis.engine.wasteRecommended, notes: analysis.engine.limitations.join("\n"),
      facets: { create: analysis.engine.facets.map((f) => ({ code: f.code, geometry: JSON.stringify(f.geometry), slopeDegrees: f.slopeDegrees, pitchRise: f.pitchRise, surfaceAreaSqFt: f.surfaceAreaSqFt, footprintAreaSqFt: f.footprintAreaSqFt, origin: f.origin, confidence: f.confidence, notes: f.notes })) },
      edges: { create: analysis.engine.edges.map((e) => ({ code: e.code, type: e.type, geometry: JSON.stringify(e.geometry), lengthFt: e.lengthFt, origin: e.origin, confidence: e.confidence, method: e.method })) },
    },
  });

  await prisma.measurement.createMany({
    data: analysis.engine.measurements.map((m) => ({
      projectId: project.id, key: m.key, label: m.label, value: m.value, unit: m.unit,
      display: m.display, origin: m.origin, confidence: m.confidence, method: m.method, sources: m.sources, notes: m.notes,
    })),
  });

  await prisma.materialCalculation.upsert({
    where: { projectId: project.id },
    update: { resultsJson: JSON.stringify(analysis.materials), assumptionsJson: JSON.stringify({ pitchRise, waste }) },
    create: { projectId: project.id, resultsJson: JSON.stringify(analysis.materials), assumptionsJson: JSON.stringify({ pitchRise, waste }) },
  });

  await prisma.project.update({ where: { id: project.id }, data: { status: pitchRise ? "completed" : "needs_review", algorithmVersion: ALGORITHM_VERSION } });
  await prisma.auditEvent.create({ data: { projectId: project.id, userId: user.id, action: "building.selected", detail: building.id } });

  const lidarJob = await prisma.processingJob.create({
    data: {
      projectId: project.id,
      createdById: user.id,
      status: "queued",
      stage: "queued",
      progress: 0,
      log: JSON.stringify([{ t: new Date().toISOString(), msg: "Automatic roof measurement queued." }]),
    },
  });
  const dispatched = await dispatchLidarJob(lidarJob.id);

  return NextResponse.json({
    ok: true,
    roofModelId: model.id,
    lidarJobId: lidarJob.id,
    lidarJob: dispatched.ok ? "dispatched" : "queued",
    dispatchReason: dispatched.ok ? null : dispatched.reason,
  });
}
