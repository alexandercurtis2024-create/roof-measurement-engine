"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPinned, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app", label: "Projects", icon: Home },
  { href: "/app/new", label: "Measure", icon: Plus },
  { href: "/app/coverage", label: "Coverage", icon: MapPinned },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children, name }: { children: React.ReactNode; name: string; role?: string }) {
  const path = usePathname();
  return (
    <div className="paper-grid min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f4efe6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-950 text-[11px] font-bold text-copper-100">RM</span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Roof Measurement Engine</div>
              <div className="text-[11px] text-ink-700/70">Maryland · v0.1.0</div>
            </div>
          </Link>
          <div className="hidden items-center gap-3 text-xs sm:flex">
            <span className="text-ink-700/80">{name}</span>
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
              <Link key={t.href} href={t.href} className={cn("flex flex-col items-center gap-1 py-3 text-[11px] font-medium", active ? "text-copper-700" : "text-ink-700/60")}>
                <Icon size={20} />{t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
