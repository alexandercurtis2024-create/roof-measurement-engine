"use client";
import { useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";

export default function NewMeasurementPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ street: form.get("street"), city: form.get("city"), state: form.get("state") || "MD", zip: form.get("zip") }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Could not start project"); setPending(false); return; }
    window.location.href = `/app/projects/${data.id}`;
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New measurement</h1>
        <p className="text-sm text-ink-700/70">Maryland addresses only. We geocode, find the parcel, and list building footprints.</p>
      </div>
      <Card className="p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Street"><Input name="street" placeholder="214 Main Street" required autoComplete="street-address" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><Input name="city" placeholder="Annapolis" required /></Field>
            <Field label="ZIP"><Input name="zip" placeholder="21401" inputMode="numeric" /></Field>
          </div>
          <Field label="State"><Input name="state" defaultValue="MD" maxLength={2} /></Field>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <Button disabled={pending} className="w-full">{pending ? "Locating property…" : "Locate property"}</Button>
          <p className="text-xs leading-5 text-ink-700/60">Live sources: Census geocoder, MD iMAP parcels/footprints, OSM buildings. This can take 10–20 seconds.</p>
        </form>
      </Card>
    </div>
  );
}
