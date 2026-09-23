"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        company: form.get("company"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not create account");
      setPending(false);
      return;
    }
    window.location.href = "/app";
  }

  return (
    <div className="paper-grid grid min-h-dvh place-items-center px-4 py-8">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl bg-white p-6 shadow-card">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-copper-700">Create account</div>
          <h1 className="mt-1 text-2xl font-semibold">Start measuring Maryland roofs</h1>
        </div>
        <Field label="Your name"><Input name="name" required /></Field>
        <Field label="Company"><Input name="company" placeholder="Optional" /></Field>
        <Field label="Email"><Input name="email" type="email" required /></Field>
        <Field label="Password"><Input name="password" type="password" minLength={8} required /></Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button disabled={pending} className="w-full">{pending ? "Creating…" : "Create account"}</Button>
        <p className="text-center text-sm text-ink-700/70">
          Already registered? <Link href="/login" className="font-semibold text-copper-700">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
