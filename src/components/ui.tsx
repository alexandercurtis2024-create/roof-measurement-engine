import { cn } from "@/lib/utils";
import Link from "next/link";

export function Badge({ children, tone = "slate", className }: { children: React.ReactNode; tone?: "slate" | "copper" | "green" | "red" | "blue"; className?: string }) {
  const tones = { slate: "bg-ink-900/8 text-ink-800", copper: "bg-copper-100 text-copper-700", green: "bg-emerald-100 text-emerald-800", red: "bg-red-100 text-red-800", blue: "bg-sky-100 text-sky-800" };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", tones[tone], className)}>{children}</span>;
}
export function OriginBadge({ origin }: { origin: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide origin-" + origin)}>{origin}</span>;
}
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl bg-white shadow-card ring-1 ring-black/5", className)}>{children}</section>;
}
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wider text-ink-700/70">{label}</span>{children}</label>;
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 text-ink-900 outline-none ring-copper-500/30 focus:ring-2", props.className)} />;
}
export function Button({ children, href, variant = "primary", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: string; variant?: "primary" | "secondary" | "ghost" }) {
  const styles = { primary: "bg-ink-950 text-white hover:bg-ink-800", secondary: "bg-white text-ink-900 ring-1 ring-ink-900/10 hover:bg-copper-50", ghost: "bg-transparent text-ink-800 hover:bg-ink-900/5" };
  const cls = cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[.99]", styles[variant], className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...props}>{children}</button>;
}
