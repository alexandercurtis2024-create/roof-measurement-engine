import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/app");
  return (
    <div className="paper-grid min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-between px-5 py-8">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-950 text-xs font-bold text-copper-100">RM</span>
          <span className="text-sm font-semibold">Roof Measurement Engine</span>
        </div>
        <div className="space-y-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper-700">Maryland first</p>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight">
            Measure a roof only as far as the evidence goes.
          </h1>
          <p className="max-w-xl text-base leading-7 text-ink-700/80">
            Address in. Public geospatial sources queried. Building selected. Footprint measured.
            Pitch, valleys, and hips stay unavailable until LiDAR or a contractor supplies them.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="rounded-xl bg-ink-950 px-5 py-3 text-center text-sm font-semibold text-white">
              Create account
            </Link>
            <Link href="/login" className="rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold ring-1 ring-black/10">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
