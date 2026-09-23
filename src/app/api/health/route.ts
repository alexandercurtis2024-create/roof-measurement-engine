import { NextResponse } from "next/server";
import { ALGORITHM_VERSION } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "roof-measurement-engine",
    algorithmVersion: ALGORITHM_VERSION,
    market: "Maryland, USA",
  });
}
