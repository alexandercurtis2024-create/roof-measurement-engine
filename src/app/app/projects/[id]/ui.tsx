"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Badge, Button, Card, Field, Input, OriginBadge } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

const PropertyMap = dynamic(() => import("@/components/PropertyMap").then((m) => m.PropertyMap), { ssr: false });

export function ProjectWorkspace({ payload }: { payload: any }) {
  const { project, property, buildings, measurements, roofModel, materials, sources, confidence } = payload;
  const [selected, setSelected] = useState(buildings.find((b: any) => b.selected)?.id || buildings[0]?.id || "");
  const [pitch, setPitch] = useState(roofModel?.facets?.[0]?.pitchRise?.toString() || "");
  const [waste, setWaste] = useState(roofModel?.wasteRecommended ? String(Math.round(roofModel.wasteRecommended * 100)) : "12");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  const [msg, setMsg] = useState("");
  const parsedBuildings = useMemo(() => buildings.map((b: any) => ({ ...b, geom: JSON.parse(b.geometry) })), [buildings]);
  const parcel = property.parcelGeometry ? JSON.parse(property.parcelGeometry) : null;

  async function runAnalysis() {
    if (!selected) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/projects/${project.id}/select-building`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildingId: selected, pitchRise: pitch ? Number(pitch) : null, waste: waste ? Number(waste) / 100 : null }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "Analysis failed"); setBusy(false); return; }
    window.location.reload();
  }

  const tabs = ["overview", "model", "measurements", "materials", "confidence", "sources", "report"];
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-copper-700">{property.county || "Maryland"}</div>
        <h1 className="text-2xl font-semibold leading-tight">{property.normalizedAddress}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{project.status.replaceAll("_", " ")}</Badge>
          <Badge tone="copper">Engine {project.algorithmVersion}</Badge>
        </div>
      </div>
      {property.latitude && property.longitude ? (
        <PropertyMap lat={property.latitude} lon={property.longitude} parcel={parcel} selectedId={selected}
          buildings={parsedBuildings.map((b: any) => ({ id: b.id, geometry: b.geom, selected: b.id === selected }))} onSelect={setSelected} />
      ) : null}
      <p className="text-[11px] text-ink-700/60">Imagery © Esri, Maxar. Mosaic date is not property-specific.</p>
      <Card className="p-4">
        <h2 className="font-semibold">Select structure</h2>
        <p className="mt-1 text-sm text-ink-700/70">Never silently measure the garage. Tap a footprint, then run analysis.</p>
        <div className="mt-3 space-y-2">
          {parsedBuildings.map((b: any) => (
            <button key={b.id} onClick={() => setSelected(b.id)} className={`w-full rounded-xl p-3 text-left ring-1 ${selected === b.id ? "bg-copper-50 ring-copper-400" : "bg-white ring-black/10"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">{b.source.replaceAll("_", " ")}</div>
                <div className="text-sm">{formatNumber(b.footprintAreaSqFt, 0)} sq ft</div>
              </div>
              <div className="text-xs text-ink-700/60">{b.rankReason}</div>
            </button>
          ))}
          {parsedBuildings.length === 0 ? <p className="text-sm text-red-800">No footprints found. Manual review required.</p> : null}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Manual pitch (rise/12)"><Input value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Leave blank if unknown" inputMode="decimal" /></Field>
          <Field label="Waste % override"><Input value={waste} onChange={(e) => setWaste(e.target.value)} inputMode="decimal" /></Field>
        </div>
        <Button className="mt-4 w-full" disabled={busy || !selected} onClick={runAnalysis}>{busy ? "Analyzing sources…" : "Analyze selected building"}</Button>
        {msg ? <p className="mt-2 text-sm text-red-700">{msg}</p> : null}
      </Card>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${tab === t ? "bg-ink-950 text-white" : "bg-white ring-1 ring-black/10"}`}>{t}</button>
        ))}
      </div>
      {tab === "overview" && (
        <Card className="space-y-3 p-4">
          <p className="text-sm leading-6">Geocode: {property.geocodeProvider} · {property.geocodeQuality}. Parcel {property.parcelId || "not found"} via {property.parcelSource || "—"}.</p>
          <p className="text-sm">{roofModel ? roofModel.method : "Select a building and run analysis to generate measurements."}</p>
        </Card>
      )}
      {tab === "measurements" && (
        <div className="space-y-2">
          {measurements.map((m: any) => (
            <Card key={m.key} className="p-4">
              <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-semibold">{m.label}</div><div className="text-lg">{m.display}</div></div><OriginBadge origin={m.origin} /></div>
              <div className={`mt-1 text-xs conf-${m.confidence}`}>Confidence: {m.confidence.replaceAll("_", " ")}</div>
              <p className="mt-2 text-xs leading-5 text-ink-700/70">{m.method}</p>
            </Card>
          ))}
        </div>
      )}
      {tab === "materials" && (
        <Card className="space-y-3 p-4">
          {materials ? (
            <>
              <p className="text-sm leading-6">{materials.note}</p>
              {(materials.lines || []).map((l: any) => (
                <div key={l.item} className="flex items-center justify-between border-b border-black/5 py-2 text-sm">
                  <div><div className="font-semibold">{l.item}</div><div className="text-xs text-ink-700/60">{l.basis}</div></div>
                  <div className="text-right"><div>{l.qty ?? "—"} {l.unit}</div><OriginBadge origin={l.origin} /></div>
                </div>
              ))}
            </>
          ) : <p className="text-sm">Run analysis first.</p>}
        </Card>
      )}
      {tab === "confidence" && confidence.map((c: any) => (
        <Card key={c.id} className="p-4"><div className="text-sm font-semibold capitalize">{c.key}</div><p className="mt-2 text-sm leading-6">{c.explanation}</p></Card>
      ))}
      {tab === "sources" && sources.map((s: any) => (
        <Card key={s.id} className="p-4 text-sm"><div className="font-semibold">{s.dataset}</div><div className="text-xs uppercase text-ink-700/60">{s.kind} · {s.provider}</div><p className="mt-2 text-xs">{s.attribution}</p></Card>
      ))}
      {tab === "model" && (
        <Card className="space-y-3 p-4">
          <p className="text-sm">v0.1 uses the measured footprint as facet F1. Plane splitting requires LiDAR, which is discovered but not auto-ingested in the web request.</p>
        </Card>
      )}
      {tab === "report" && (
        <Card className="space-y-3 p-4">
          <Button href={`/app/projects/${project.id}/report`} className="w-full">Open report</Button>
          <Button href={`/api/projects/${project.id}/report.pdf`} variant="secondary" className="w-full">Download PDF</Button>
        </Card>
      )}
    </div>
  );
}
