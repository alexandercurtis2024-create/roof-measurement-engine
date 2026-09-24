import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { workerAuthorized } from "@/lib/worker-auth";

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
  return NextResponse.json({ id: job.id, lon: p.longitude, lat: p.latitude, address: p.normalizedAddress, buildingId: selected?.id || null, engine: "v1.0.0-cand" });
}
