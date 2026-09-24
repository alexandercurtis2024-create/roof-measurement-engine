"use client";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
function parseAddress(raw: string) {
  const line = raw.trim().replace(/\s+/g, " ");
  const m = line.match(/^(.*?),\s*([^,]+),\s*([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
  if (m) return { street: m[1], city: m[2], state: m[3].toUpperCase(), zip: m[4] || "" };
  const parts = line.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const st = last.match(/^([A-Za-z]{2})\s*(\d{5})?$/);
    return { street: parts[0], city: parts.length > 2 ? parts[1] : parts[0], state: st ? st[1].toUpperCase() : "MD", zip: st?.[2] || "" };
  }
  return { street: line, city: "", state: "MD", zip: "" };
}
export default function NewMeasurementPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [line, setLine] = useState("");
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseAddress(line);
    if (!parsed.street || !parsed.city) { setError("Include city, like 214 Main Street, Annapolis, MD 21401"); return; }
    setPending(true); setError("");
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error?.includes("Maryland") ? "Automatic measurement is Maryland-only right now." : data.error || "Could not find that property.");
      setPending(false); return;
    }
    window.location.href = `/app/projects/${data.id}`;
  }
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-copper-800">Measure a roof</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Enter the property address</h1>
      </div>
      <Card className="p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <Input value={line} onChange={(e) => setLine(e.target.value)} placeholder="123 Main Street, Annapolis, MD 21401" autoComplete="street-address" required className="text-base" />
          {error ? <p className="text-sm font-medium text-red-800">{error}</p> : null}
          <Button disabled={pending} className="min-h-12 w-full text-base">{pending ? "Finding property…" : "Find property"}</Button>
        </form>
      </Card>
    </div>
  );
}
