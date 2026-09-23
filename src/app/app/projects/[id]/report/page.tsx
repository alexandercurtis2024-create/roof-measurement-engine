import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OriginBadge } from "@/components/ui";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, organizationId: user.organizationId },
    include: { property: true, measurements: true, roofModel: true, organization: { include: { settings: true } } },
  });
  if (!project?.property) notFound();
  const sources = await prisma.dataSourceRecord.findMany({ where: { projectId: project.id } });
  return (
    <article className="mx-auto max-w-3xl space-y-8 bg-white p-6 text-ink-950">
      <header className="border-b border-black/10 pb-4">
        <div className="text-xs uppercase tracking-[0.2em] text-copper-700">Roof Measurement Report</div>
        <h1 className="mt-2 text-3xl font-semibold">{project.property.normalizedAddress}</h1>
        <p className="text-sm text-ink-700/70">{project.organization.settings?.companyName || project.organization.name} · Engine {project.algorithmVersion}</p>
      </header>
      <section>
        <h2 className="text-lg font-semibold">Measurements</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead><tr className="border-b text-xs uppercase text-ink-700/60"><th className="py-2">Item</th><th>Value</th><th>Origin</th></tr></thead>
          <tbody>
            {project.measurements.map((m) => (
              <tr key={m.id} className="border-b border-black/5"><td className="py-2">{m.label}</td><td>{m.display}</td><td><OriginBadge origin={m.origin} /></td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Limitations</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{project.roofModel?.notes}</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Provenance</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {sources.map((s) => <li key={s.id}>{s.kind}: {s.dataset} ({s.provider})</li>)}
        </ul>
      </section>
    </article>
  );
}
