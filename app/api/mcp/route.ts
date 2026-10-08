import {
  createMcpHandler,
  requireBearerAuth,
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import { buildKeloMcpServer, type KeloMcpAuth } from "@/lib/mcp/kelo-tools";
import { verifyMcpAccessToken } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mcpUrl(request: Request) {
  return new URL("/api/mcp", request.url);
}

async function verifyKeloAccessToken(token: string): Promise<AuthInfo> {
  const payload = verifyMcpAccessToken(token);
  if (!payload) {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "Jeton MCP Kelo Social invalide ou expiré.");
  }

  const did = String(payload.did || "");
  const pdsUrl = String(payload.pdsUrl || "");
  const accessJwt = String(payload.accessJwt || "");
  const handle = String(payload.handle || "");
  if (!did.startsWith("did:") || !accessJwt || !pdsUrl) {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "Contexte Kelo Social invalide.");
  }

  try {
    const response = await fetch(pdsUrl.replace(/\/$/, "") + "/xrpc/com.atproto.server.getSession", {
      headers: { Authorization: "Bearer " + accessJwt, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("session");
    const session = await response.json();
    if (session.did !== did) throw new Error("identity");
  } catch {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "La session Kelo Social a expiré ou n'est plus valide.");
  }

  return {
    token,
    clientId: "mcp-kelo-user",
    scopes: String(payload.scope || "kelo:read kelo:write").split(/\s+/).filter(Boolean),
    expiresAt: payload.exp,
    extra: { keloDid: did, keloHandle: handle, keloPdsUrl: pdsUrl, keloAccessJwt: accessJwt },
  };
}

const handler = createMcpHandler((ctx) => {
  const info = ctx.authInfo;
  if (!info) throw new Error("Authentification Kelo Social requise.");
  const extra = info.extra || {};
  const auth: KeloMcpAuth = {
    accessToken: String(extra.keloAccessJwt || ""),
    did: String(extra.keloDid || ""),
    handle: String(extra.keloHandle || ""),
    pdsUrl: String(extra.keloPdsUrl || ""),
  };
  return buildKeloMcpServer(auth);
});

async function serve(request: Request) {
  const gate = requireBearerAuth({
    verifier: { verifyAccessToken: verifyKeloAccessToken },
    requiredScopes: ["kelo:read"],
    expectedResource: mcpUrl(request),
    resourceMetadataUrl: new URL("/.well-known/oauth-protected-resource/mcp", request.url),
  });
  const auth = await gate(request);
  if (auth instanceof Response) return auth;
  return handler.fetch(request, { authInfo: auth });
}

export async function GET(request: Request) { return serve(request); }
export async function POST(request: Request) { return serve(request); }
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  }});
}
