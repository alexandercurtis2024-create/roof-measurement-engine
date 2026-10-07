import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing is not configured. A failed or unavailable run is never billed.", price: { reportUsd: 19, monthlyUsd: 149 } }, { status: 503 });
  }
  return NextResponse.json({ error: "Stripe secret is present. Checkout session is not charged for UNAVAILABLE jobs." }, { status: 503 });
}
