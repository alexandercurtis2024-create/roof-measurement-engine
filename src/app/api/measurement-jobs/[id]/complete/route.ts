import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { workerAuthorized } from "@/lib/worker-auth";
import { ORIGIN } from "@/lib/constants";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!workerAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json()) as any;
  if (!Number.isFinite(body.roofAreaSqFt) || body.roofAreaSqFt < 50 || body.roofAreaSqFt > 200000) {
    return NextResponse.json({ error: "invalid area" }, { status: 400 });
  }
  const job = await prisma.processingJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!["claimed", "running"].includes(job.status)) return NextResponse.json({ error: "not_running" }, { status: 409 });
  const events = JSON.parse(job.log || "[]");
  events.push({ t: new Date().toISOString(), msg: "complete", result: body });
  await prisma.processingJob.update({ where: { id }, data: { status: "complete", stage: "complete", progress: 100, finishedAt: new Date(), log: JSON.stringify(events).slice(0, 12000) } });
  const estimated = body.provenance === "ESTIMATED" || body.provenance === "imagery_estimate" || body.areaMode === "ESTIMATED";
  const origin = estimated ? ORIGIN.ESTIMATED : ORIGIN.MEASURED;
  const note = body.provenance === "imagery_estimate"
    ? "Imagery height estimate. Not a measured roof. Verify before ordering."
    : estimated
      ? "Estimate from planar points. This tile does not label buildings. Verify before ordering."
      : "Building-class LiDAR path from engine_frozen.";
  const rows = [
    { key: "lidar_roof_area", label: "LiDAR roof area", value: body.roofAreaSqFt, unit: "sq ft", display: `${Math.round(body.roofAreaSqFt).toLocaleString()} sq ft`, origin, confidence: estimated ? "low" : (body.confidence || "moderate"), method: body.engineVersion || "v1.0.0-cand", sources: body.dataset || "public lidar", notes: note },
    { key: "lidar_squares", label: "LiDAR squares", value: body.squares ?? body.roofAreaSqFt / 100, unit: "squares", display: Number(body.squares ?? body.roofAreaSqFt / 100).toFixed(2), origin: estimated ? ORIGIN.ESTIMATED : ORIGIN.DERIVED, confidence: estimated ? "low" : (body.confidence || "moderate"), method: "area/100", sources: "derived from lidar_roof_area", notes: estimated ? "Not an ordering number until verified." : null },
    { key: "lidar_pitch", label: "LiDAR predominant pitch", value: body.predominantPitchRaw ?? null, unit: "/12", display: body.predominantPitchDisplay || "unavailable", origin: body.predominantPitchRaw == null ? ORIGIN.UNAVAILABLE : origin, confidence: estimated ? "low" : (body.confidence || "moderate"), method: body.engineVersion || "v1.0.0-cand", sources: "plane fit on roof points", notes: "Does not overwrite a manual pitch." },
  ];
  for (const row of rows) {
    await prisma.measurement.deleteMany({ where: { projectId: job.projectId, key: row.key } });
    await prisma.measurement.create({ data: { projectId: job.projectId, ...row } });
  }
  return NextResponse.json({ ok: true });
}
