"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPinned, Plus, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
const tabs = [
  { href: "/app", label: "Projects", icon: Home },
  { href: "/app/new", label: "Measure", icon: Plus },
  { href: "/app/coverage", label: "Coverage", icon: MapPinned },
  { href: "/app/settings", label: "Settings", icon: Settings },
];
export function AppShell({ children, name, role }: { children: React.ReactNode; name: string; role: string }) {
  const path = usePathname();
  return (
    <div className="paper-grid min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f4efe6]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-950 text-[11px] font-bold text-copper-100">RM</span>
            <div className="leading-tight">
              <div className="text-base font-semibold">RoofMeasure</div>
              <div className="text-[11px] font-medium text-ink-700/70">Maryland</div>
            </div>
          </Link>
          <div className="hidden items-center gap-3 text-xs sm:flex">
            <span className="text-ink-700/80">{name}</span>
            {role === "admin" || role === "engineer" ? (
              <Link href="/app/admin" className="inline-flex items-center gap-1 text-copper-700"><Shield size={14} /> Diagnostics</Link>
            ) : null}
            <form action="/api/auth/logout" method="post"><button className="text-ink-700/70">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-28">{children}</main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-[#f4efe6]/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {tabs.map((t) => {
            const active = path === t.href || (t.href !== "/app" && path.startsWith(t.href));
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className={cn("flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-copper-800" : "text-ink-700/55")}>
                <span className={cn("grid h-10 w-10 place-items-center rounded-2xl", t.href === "/app/new" ? "bg-ink-950 text-white" : "")}>
                  <Icon size={t.href === "/app/new" ? 22 : 20} />
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
