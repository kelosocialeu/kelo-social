import { NextResponse } from "next/server";
import { authorizationServerMetadata, createOAuthAccessTokenResponse, createAccessToken, createRefreshToken, encodeClientMetadata, readAuthorizationCode, refreshMcpUser, resolveClientMetadata, validateRedirect, verifyMcpRefreshToken } from "@/lib/mcp/oauth";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function GET(request: Request) {
  return NextResponse.json(authorizationServerMetadata(request));
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    if (body?.redirect_uris) {
      try {
        if (!Array.isArray(body.redirect_uris) || !body.redirect_uris.length) throw new Error("redirect_uris est obligatoire.");
        const metadata = {
          client_name: typeof body.client_name === "string" ? body.client_name.slice(0, 200) : "Client MCP",
          redirect_uris: body.redirect_uris,
          grant_types: body.grant_types || ["authorization_code", "refresh_token"],
          response_types: body.response_types || ["code"],
          token_endpoint_auth_method: "none",
          scope: body.scope || "kelo:read kelo:write",
        };
        metadata.redirect_uris.forEach((uri: string) => { const url = new URL(uri); if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("redirect_uri HTTPS obligatoire."); });
        const clientId = encodeClientMetadata(metadata);
        return NextResponse.json({ ...metadata, client_id: clientId, client_id_issued_at: Math.floor(Date.now()/1000) });
      } catch (error) { return jsonError(error instanceof Error ? error.message : "Enregistrement impossible."); }
    }
  }

  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Requête OAuth invalide.");

  const grantType = String(form.get("grant_type") || "");
  const scope = String(form.get("scope") || "kelo:read kelo:write");

  if (grantType === "authorization_code") {
    const code = String(form.get("code") || "");
    const redirectUri = String(form.get("redirect_uri") || "");
    const clientId = String(form.get("client_id") || "");
    const codeVerifier = String(form.get("code_verifier") || "");
    const claims = readAuthorizationCode(code);
    if (!claims) return jsonError("Code d'autorisation invalide ou expiré.", 400);
    if (claims.clientId !== clientId || claims.redirectUri !== redirectUri) return jsonError("Client ou redirect_uri invalide.", 400);
    if (!codeVerifier) return jsonError("code_verifier manquant.", 400);
    const verifier = createHash("sha256").update(codeVerifier).digest("base64url");
    if (verifier !== claims.codeChallenge) return jsonError("PKCE invalide.", 400);
    return NextResponse.json(createOAuthAccessTokenResponse(claims, scope));
  }

  if (grantType === "refresh_token") {
    const token = String(form.get("refresh_token") || "");
    const claims = verifyMcpRefreshToken(token);
    if (!claims) return jsonError("Refresh token invalide ou expiré.", 400);
    try {
      const user = await refreshMcpUser(claims.refreshJwt, claims.pdsUrl, claims.did);
      return NextResponse.json(createOAuthAccessTokenResponse(user, claims.scope || scope));
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Impossible de renouveler la session.", 401);
    }
  }

  return jsonError("grant_type non supporté.");
}
