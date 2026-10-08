import { NextResponse } from "next/server";
import { protectedResourceMetadata } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json(protectedResourceMetadata(request));
}
