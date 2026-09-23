"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Sign in failed");
      setPending(false);
      return;
    }
    window.location.href = "/app";
  }

  return (
    <div className="paper-grid grid min-h-dvh place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-card">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-copper-700">Sign in</div>
          <h1 className="mt-1 text-2xl font-semibold">Welcome back</h1>
        </div>
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button disabled={pending} className="w-full">{pending ? "Signing in…" : "Sign in"}</Button>
        <p className="text-center text-sm text-ink-700/70">
          No account? <Link href="/signup" className="font-semibold text-copper-700">Create one</Link>
        </p>
      </form>
    </div>
  );
}
