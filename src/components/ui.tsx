import { cn } from "@/lib/utils";
import Link from "next/link";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-700/70">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-ink-900/10 bg-white px-3 py-3 text-ink-900 outline-none ring-copper-500/30 focus:ring-2",
        props.className,
      )}
    />
  );
}

export function Button({
  children,
  href,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-ink-950 text-white hover:bg-ink-800",
    secondary: "bg-white text-ink-900 ring-1 ring-ink-900/10",
    ghost: "bg-transparent text-ink-800",
  };
  const cls = cn("inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold", styles[variant], className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
