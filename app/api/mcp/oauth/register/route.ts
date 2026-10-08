import { NextResponse } from "next/server";
import { encodeClientMetadata } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.redirect_uris) || !body.redirect_uris.length) throw new Error("redirect_uris est obligatoire.");
    for (const redirectUri of body.redirect_uris) {
      const url = new URL(String(redirectUri));
      if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("Les redirect_uri doivent utiliser HTTPS.");
    }
    const metadata = {
      client_name: typeof body.client_name === "string" ? body.client_name.slice(0, 200) : "Client MCP",
      redirect_uris: body.redirect_uris.map(String),
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: typeof body.scope === "string" ? body.scope : "kelo:read kelo:write",
    };
    return NextResponse.json({
      ...metadata,
      client_id: encodeClientMetadata(metadata),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    return NextResponse.json({ error: "invalid_client_metadata", error_description: error instanceof Error ? error.message : "Enregistrement impossible." }, { status: 400 });
  }
}
