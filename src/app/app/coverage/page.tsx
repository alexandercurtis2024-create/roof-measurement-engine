"use client";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
export default function CoveragePage() {
  const [line, setLine] = useState("");
  const [out, setOut] = useState("");
  function check(e: React.FormEvent) {
    e.preventDefault();
    const md = /\bMD\b/i.test(line) || /maryland/i.test(line);
    setOut(md ? "Automatic roof measurement is available in Maryland. Confirm the house on the map after you search." : "Automatic measurement is Maryland-only right now.");
  }
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Can this address be measured?</h1>
        <p className="text-sm text-ink-700/70">Maryland properties can use automatic roof measurement.</p>
      </div>
      <Card className="p-5">
        <form onSubmit={check} className="space-y-3">
          <Input value={line} onChange={(e) => setLine(e.target.value)} placeholder="123 Main Street, Annapolis, MD" />
          <Button className="w-full">Check address</Button>
        </form>
        {out ? <p className="mt-4 text-sm font-medium">{out}</p> : null}
      </Card>
    </div>
  );
}
