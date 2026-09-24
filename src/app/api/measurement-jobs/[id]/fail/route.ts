import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { workerAuthorized } from "@/lib/worker-auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!workerAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json()) as { error?: string };
  const job = await prisma.processingJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  const events = JSON.parse(job.log || "[]");
  events.push({ t: new Date().toISOString(), msg: "failed", error: body.error || "unknown" });
  await prisma.processingJob.update({
    where: { id },
    data: { status: "failed", stage: "failed", finishedAt: new Date(), log: JSON.stringify(events).slice(0, 12000) },
  });
  return NextResponse.json({ ok: true });
}
