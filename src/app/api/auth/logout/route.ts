import { destroySession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await destroySession();
  const origin = req.headers.get("origin") || "https://roof-measurement-engine.vercel.app";
  return NextResponse.redirect(new URL("/", origin), 303);
}
