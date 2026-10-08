import { NextResponse } from "next/server";
import {
  authorizationServerMetadata,
  createOAuthAccessTokenResponse,
  encodeClientMetadata,
  readAuthorizationCode,
  refreshMcpUser,
  resolveClientMetadata,
  validateRedirect,
} from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formError(message: string) {
  return new NextResponse("<!doctype html><html><body><h1>Connexion Kelo Social</h1><p>" + message.replace(/[<>&"]/g, "") + "</p></body></html>", {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  return NextResponse.json(authorizationServerMetadata(request));
}

export async function POST(request: Request) {
  const form = await request.formData();
  const action = String(form.get("action") || "");
  if (action !== "login") return formError("Action OAuth invalide.");

  const clientId = String(form.get("client_id") || "");
  const redirectUri = String(form.get("redirect_uri") || "");
  const state = String(form.get("state") || "");
  const codeChallenge = String(form.get("code_challenge") || "");
  const scope = String(form.get("scope") || "kelo:read kelo:write");
  const identifier = String(form.get("identifier") || "").trim();
  const password = String(form.get("password") || "");

  try {
    const metadata = await resolveClientMetadata(clientId);
    validateRedirect(metadata, redirectUri);
    if (!codeChallenge || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) throw new Error("PKCE S256 est obligatoire.");
    if (!identifier || !password) throw new Error("Identifiant et mot de passe requis.");

    const login = await (await import("@/lib/mcp/oauth")).loginForMcp(identifier, password);
    const code = (await import("@/lib/mcp/oauth")).createAuthorizationCode({
      clientId, redirectUri, codeChallenge, scope, ...login,
    });

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    return NextResponse.redirect(url);
  } catch (error) {
    return formError(error instanceof Error ? error.message : "Connexion impossible.");
  }
}
