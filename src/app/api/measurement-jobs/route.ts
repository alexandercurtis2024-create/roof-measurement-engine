import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { LIDAR_ENGINE_VERSION } from "@/lib/constants";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: user.organizationId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const jobs = await prisma.processingJob.findMany({
    where: { projectId, NOT: { stage: "footprint_retrieved" } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { projectId?: string };
  if (!body.projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const project = await prisma.project.findFirst({ where: { id: body.projectId, organizationId: user.organizationId } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = await prisma.processingJob.create({
    data: {
      projectId: project.id,
      createdById: user.id,
      status: "queued",
      stage: "queued",
      progress: 0,
      log: JSON.stringify([{ t: new Date().toISOString(), msg: `Queued ${LIDAR_ENGINE_VERSION}` }]),
    },
  });
  return NextResponse.json({ id: job.id, status: job.status, stage: job.stage, engine: LIDAR_ENGINE_VERSION, worker: "external" });
}
