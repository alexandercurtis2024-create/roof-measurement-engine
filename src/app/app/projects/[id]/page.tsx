import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProjectWorkspace } from "./ui";
import { safeJsonParse } from "@/lib/utils";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      property: { include: { buildings: { orderBy: { rankScore: "desc" } } } },
      measurements: true,
      roofModel: { include: { facets: true, edges: true } },
      materials: true,
      confidence: true,
    },
  });
  if (!project?.property) notFound();
  const sources = await prisma.dataSourceRecord.findMany({ where: { projectId: project.id }, orderBy: { retrievedAt: "desc" } });
  return (
    <ProjectWorkspace payload={{
      project, property: project.property, buildings: project.property.buildings,
      measurements: project.measurements, roofModel: project.roofModel,
      materials: safeJsonParse(project.materials?.resultsJson, null), sources, confidence: project.confidence,
    }} />
  );
}
