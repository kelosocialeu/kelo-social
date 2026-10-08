import { NextResponse } from "next/server";
import { authorizationServerMetadata, createMcpSignupChallenge, resolveClientMetadata, validateRedirect } from "@/lib/mcp/oauth";
import { resolveDidDocument, extractPdsUrl } from "@/lib/atproto/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizationRedirect(request: Request, source: URL) {
  const target = new URL("/api/mcp/oauth/authorize", request.url);
  for (const [key, value] of source.searchParams) {
    target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target, 303);
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  // Backwards-compatibility: some MCP clients may have cached the issuer
  // itself as the authorization endpoint. If an authorization request is
  // received here, send it to the real authorization endpoint instead of
  // returning a generic 405/metadata response.
  if (
    url.searchParams.has("client_id") &&
    url.searchParams.has("redirect_uri") &&
    url.searchParams.has("response_type")
  ) {
    return authorizationRedirect(request, url);
  }

  return NextResponse.json(authorizationServerMetadata(request), {
    headers: {
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      if (body?.action === "signup_complete") {
        const returnUrl = String(body?.returnUrl || "");
        const session = body?.session;
        if (!returnUrl || !session?.did || !session?.accessJwt || !session?.refreshJwt) {
          return NextResponse.json({ error: "Données OAuth de création de compte incomplètes." }, { status: 400 });
        }
        const url = new URL(returnUrl);
        if (url.origin !== new URL(request.url).origin || url.pathname !== "/api/mcp/oauth/authorize") {
          return NextResponse.json({ error: "Continuation OAuth invalide." }, { status: 400 });
        }
        const clientId = url.searchParams.get("client_id") || "";
        const redirectUri = url.searchParams.get("redirect_uri") || "";
        const responseType = url.searchParams.get("response_type") || "";
        const state = url.searchParams.get("state") || "";
        const codeChallenge = url.searchParams.get("code_challenge") || "";
        const scope = url.searchParams.get("scope") || "kelo:read kelo:write";
        const metadata = await resolveClientMetadata(clientId);
        validateRedirect(metadata, redirectUri);
        if (responseType !== "code" || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
          return NextResponse.json({ error: "Demande OAuth/PKCE invalide." }, { status: 400 });
        }
        const document = await resolveDidDocument(String(session.did));
        extractPdsUrl(document);
        const challenge = createMcpSignupChallenge({
          clientId, redirectUri, responseType, state, codeChallenge, scope,
          did: String(session.did),
          handle: String(session.handle || ""),
          accessJwt: String(session.accessJwt),
          refreshJwt: String(session.refreshJwt),
        });
        const response = NextResponse.json({ ok: true });
        response.headers.append("Set-Cookie", "kelo_mcp_signup=" + encodeURIComponent(challenge) + "; Max-Age=600; Path=/api/mcp/oauth/authorize; HttpOnly; Secure; SameSite=Lax");
        return response;
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de préparer l’autorisation OAuth." }, { status: 400 });
    }
  }

  // OAuth authorization requests can be submitted as\n  // application/x-www-form-urlencoded. Accept that form at the issuer\n  // endpoint too, then redirect the browser to the real authorization page.
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Requête OAuth invalide." },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const target = new URL("/api/mcp/oauth/authorize", request.url);
  for (const [key, value] of form.entries()) {
    target.searchParams.set(key, String(value));
  }

  return NextResponse.redirect(target, 303);
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}
