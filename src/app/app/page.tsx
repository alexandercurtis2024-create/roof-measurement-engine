import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge, Button, Card } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";

export default async function DashboardPage() {
  const user = await requireUser();
  if (!user) return null;
  const projects = await prisma.project.findMany({
    where: { organizationId: user.organizationId },
    include: { property: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-ink-700/70">Each address becomes a project with full provenance.</p>
        </div>
        <Button href="/app/new">New measurement</Button>
      </div>
      {projects.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-ink-700/80">No projects yet. Enter a Maryland address to run the real GIS pipeline.</p>
          <div className="mt-4"><Button href="/app/new">Start with an address</Button></div>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/app/projects/${p.id}`}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{p.property?.normalizedAddress || p.name}</div>
                    <div className="mt-1 text-xs text-ink-700/60">Updated {formatDistanceToNow(p.updatedAt, { addSuffix: true })} · Engine {p.algorithmVersion}</div>
                  </div>
                  <Badge tone={p.status === "completed" ? "green" : p.status === "failed" ? "red" : "copper"}>{p.status.replaceAll("_", " ")}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
