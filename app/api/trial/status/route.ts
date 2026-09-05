import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  return NextResponse.json({
    now: now.toISOString(),
    durationMs: 48 * 60 * 60 * 1000,
  });
}
