import { Card, Badge } from "@/components/ui";
import { COUNTY_COVERAGE, MARYLAND_STATE, coverageLabel } from "@/lib/providers/coverage";

export default function CoveragePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Maryland coverage registry</h1>
        <p className="text-sm text-ink-700/70">Verified public services. County-specific authoritative footprints are not assumed.</p>
      </div>
      <Card className="space-y-2 p-4">
        <div className="font-semibold">{MARYLAND_STATE.name}</div>
        <p className="text-sm leading-6">{MARYLAND_STATE.notes}</p>
        <div className="flex flex-wrap gap-2">
          <Badge tone="green">{coverageLabel(MARYLAND_STATE.address)}</Badge>
          <Badge tone="copper">{coverageLabel(MARYLAND_STATE.footprint)}</Badge>
          <Badge tone="copper">{coverageLabel(MARYLAND_STATE.lidar)}</Badge>
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {COUNTY_COVERAGE.map((c) => (
          <Card key={c.code} className="p-4">
            <div className="font-semibold">{c.name}</div>
            <div className="mt-1 text-xs text-ink-700/60">{c.code}</div>
            <p className="mt-2 text-sm">{c.notes}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
