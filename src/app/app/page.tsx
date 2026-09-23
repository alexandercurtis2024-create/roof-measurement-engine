import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function AppHome() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="min-h-dvh px-5 py-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-copper-700">Maryland v0.1</p>
      <h1 className="mt-2 text-2xl font-semibold">Hello, {session.name}</h1>
      <p className="mt-2 text-sm text-ink-700/80">Account and database are live. Measurement workspace files are still uploading.</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-ink-950 px-4 py-3 text-sm font-semibold text-white">Home</Link>
    </div>
  );
}
