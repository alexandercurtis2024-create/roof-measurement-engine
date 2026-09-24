"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button, Card, Input } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
const PropertyMap = dynamic(() => import("@/components/PropertyMap").then((m) => m.PropertyMap), { ssr: false });
function friendlyConfidence(c?: string) {
  if (c === "high") return { title: "High confidence", body: "Good source data. Review before ordering materials." };
  if (c === "moderate") return { title: "Review recommended", body: "Automatic result available. Verify before ordering." };
  if (c === "low") return { title: "Verify manually", body: "Automatic data is thin. Check the roof before using these numbers." };
  return null;
}
export function ProjectWorkspace({ payload }: { payload: any }) {
  const { project, property, buildings, measurements, jobs } = payload;
  const primary = buildings.find((b: any) => b.selected) || buildings.find((b: any) => b.isPrimaryCandidate) || buildings[0];
  const accessories = buildings.filter((b: any) => primary && b.id !== primary.id && (b.rankReason || "").includes("on parcel") && b.footprintAreaSqFt < (primary.footprintAreaSqFt || 99999) * 0.5);
  const [selected, setSelected] = useState(primary?.id || "");
  const [pitch, setPitch] = useState("");
  const [waste, setWaste] = useState("12");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("summary");
  const [msg, setMsg] = useState("");
  const [showVerify, setShowVerify] = useState(false);
  const [showMap, setShowMap] = useState(project.status === "needs_building_selection");
  const [jobSnap, setJobSnap] = useState(jobs?.[0] || null);
  const parsedBuildings = useMemo(() => buildings.map((b: any) => ({ ...b, geom: JSON.parse(b.geometry) })), [buildings]);
  const parcel = property.parcelGeometry ? JSON.parse(property.parcelGeometry) : null;
  const chosen = parsedBuildings.find((b: any) => b.id === selected);
  const lidarArea = measurements.find((m: any) => m.key === "lidar_roof_area" && m.display && m.display !== "Unavailable");
  const lidarSq = measurements.find((m: any) => m.key === "lidar_squares");
  const lidarPitch = measurements.find((m: any) => m.key === "lidar_pitch");
  const areaDisplay = lidarArea?.display;
  const pitchDisplay = lidarPitch?.display && lidarPitch.display !== "unavailable" ? lidarPitch.display : pitch ? `${pitch}/12` : null;
  const conf = friendlyConfidence(lidarArea?.confidence);
  async function runAnalysis() {
    if (!selected) return;
    setBusy(true); setMsg("");
    const res = await fetch(`/api/projects/${project.id}/select-building`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buildingId: selected, pitchRise: pitch ? Number(pitch) : null, waste: waste ? Number(waste) / 100 : null }),
    });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error || "Could not measure this roof."); setBusy(false); return; }
    window.location.reload();
  }
  useEffect(() => {
    let stop = false;
    async function poll() {
      const res = await fetch(`/api/measurement-jobs?projectId=${project.id}`);
      if (!res.ok || stop) return;
      const data = await res.json();
      const latest = data.jobs?.[0];
      if (latest) setJobSnap(latest);
      if (latest && latest.status === "complete") window.location.reload();
      else if (latest && latest.status !== "failed") setTimeout(poll, 4000);
    }
    if (jobSnap && !["complete", "failed"].includes(jobSnap.status)) poll();
    return () => { stop = true; };
  }, [project.id, jobSnap?.id, jobSnap?.status]);
  const measuring = busy || (jobSnap && !["complete", "failed"].includes(jobSnap.status) && !lidarArea);
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-copper-800">Property found</div>
        <h1 className="text-2xl font-semibold leading-tight">{property.normalizedAddress}</h1>
      </div>
      {showMap && property.latitude && property.longitude ? (
        <PropertyMap lat={property.latitude} lon={property.longitude} parcel={parcel} selectedId={selected}
          buildings={parsedBuildings.map((b: any) => ({ id: b.id, geometry: b.geom, selected: b.id === selected }))} onSelect={setSelected} />
      ) : null}
      <Card className="p-4">
        {chosen ? <p className="text-sm">Main home · about {formatNumber(chosen.footprintAreaSqFt, 0)} sq ft footprint</p> : <p className="text-sm text-red-800">We could not identify a building automatically.</p>}
        {accessories.length ? <p className="mt-2 text-sm">Also on this property: {accessories.length} additional building{accessories.length === 1 ? "" : "s"}. Measuring the main home only.</p> : null}
        <Button className="mt-4 min-h-12 w-full text-base" disabled={busy || !selected} onClick={runAnalysis}>{busy ? "Starting measurement…" : "Measure roof"}</Button>
        <button className="mt-3 text-sm font-semibold text-copper-800" onClick={() => setShowMap((v) => !v)}>{showMap ? "Hide map" : "Change building"}</button>
        {msg ? <p className="mt-2 text-sm text-red-800">{msg}</p> : null}
      </Card>
      {measuring ? (
        <Card className="p-5">
          <div className="text-lg font-semibold">Measuring roof</div>
          <p className="mt-2 text-sm">You can leave this screen. Measurement keeps running.</p>
        </Card>
      ) : null}
      {lidarArea ? (
        <Card className="p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-copper-800">Measurement complete</div>
          <div className="mt-3 text-5xl font-semibold tracking-tight">{areaDisplay?.replace(" sq ft", "")}</div>
          <div className="text-sm font-medium text-ink-700/70">SQ FT</div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div><div className="text-xs font-semibold uppercase text-ink-700/60">Squares</div><div className="text-2xl font-semibold">{lidarSq?.display || "—"}</div></div>
            <div><div className="text-xs font-semibold uppercase text-ink-700/60">Pitch</div><div className="text-2xl font-semibold">{pitchDisplay || "—"}</div></div>
          </div>
          {conf ? <div className="mt-4 rounded-xl bg-[#f4efe6] p-3"><div className="font-semibold">{conf.title}</div><p className="mt-1 text-sm">{conf.body}</p></div> : null}
          <button className="mt-3 text-sm font-semibold text-copper-800" onClick={() => setShowVerify((v) => !v)}>Verify pitch manually</button>
          {showVerify ? <div className="mt-3 flex gap-2"><Input value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="9" inputMode="decimal" /><Button onClick={runAnalysis}>Save</Button></div> : null}
        </Card>
      ) : null}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["summary","Summary"],["roof","Roof"],["details","Details"],["materials","Materials"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} className={`min-h-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${tab===id?"bg-ink-950 text-white":"bg-white ring-1 ring-black/10"}`}>{label}</button>
        ))}
      </div>
      {tab==="summary" && <Card className="p-4 text-sm"><p>The home was selected automatically. Tap Measure roof.</p></Card>}
      {tab==="roof" && <Card className="p-4 text-sm"><p>Use Change building only if the wrong structure was selected.</p></Card>}
      {tab==="details" && measurements.filter((m: any) => !["ridge","hip","valley","eave","rake"].some((k) => m.key.includes(k))).map((m: any) => (
        <Card key={m.key} className="p-4"><div className="text-sm font-semibold">{m.label}</div><div className="text-xl font-semibold">{m.display}</div></Card>
      ))}
      {tab==="materials" && (
        <Card className="space-y-4 p-4">
          <div><div className="text-xs font-semibold uppercase text-ink-700/60">Base squares</div><div className="text-3xl font-semibold">{lidarSq?.display || "—"}</div></div>
          <div className="flex flex-wrap gap-2">{["10","12","15"].map((w) => (
            <button key={w} onClick={() => setWaste(w)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${waste===w?"bg-ink-950 text-white":"bg-white ring-1 ring-black/10"}`}>{w}%</button>
          ))}</div>
          {lidarSq?.display ? <div><div className="text-xs font-semibold uppercase text-ink-700/60">Ordering squares</div><div className="text-3xl font-semibold">{(Number(lidarSq.display)*(1+Number(waste||0)/100)).toFixed(2)}</div></div> : <p className="text-sm">Measure the roof first.</p>}
        </Card>
      )}
    </div>
  );
}
