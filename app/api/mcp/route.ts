import {
  createMcpHandler,
  requireBearerAuth,
  OAuthError,
  OAuthErrorCode,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import { resolveDidDocument, extractPdsUrl } from "@/lib/atproto/discovery";
import { buildKeloMcpServer, type KeloMcpAuth } from "@/lib/mcp/kelo-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function verifyKeloAccessToken(token: string): Promise<AuthInfo> {
  const payload = decodeJwtPayload(token);
  const did = String(payload?.iss || payload?.sub || "");
  if (!did.startsWith("did:")) {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "Le jeton AT Protocol ne contient pas une identité valide.");
  }

  let pdsUrl: string;
  try {
    const document = await resolveDidDocument(did);
    pdsUrl = extractPdsUrl(document);
    const parsed = new URL(pdsUrl);
    if (parsed.protocol !== "https:") throw new Error("PDS non sécurisé");
  } catch {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "Impossible de déterminer le PDS du compte.");
  }

  let session: any;
  try {
    const response = await fetch(`${pdsUrl.replace(/\/$/, "")}/xrpc/com.atproto.server.getSession`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("invalid session");
    session = await response.json();
  } catch {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "La session Kelo Social a expiré ou est invalide.");
  }

  if (session.did !== did) {
    throw new OAuthError(OAuthErrorCode.InvalidToken, "L'identité du jeton ne correspond pas au compte AT Protocol.");
  }

  const expiresAt = typeof payload?.exp === "number" ? payload.exp : Math.floor(Date.now() / 1000) + 300;

  return {
    token,
    clientId: "kelo-social-user-agent",
    scopes: ["kelo:read", "kelo:write"],
    expiresAt,
    extra: {
      keloDid: session.did,
      keloHandle: session.handle,
      keloPdsUrl: pdsUrl,
    },
  };
}

const authGate = requireBearerAuth({
  verifier: { verifyAccessToken: verifyKeloAccessToken },
});

const handler = createMcpHandler((ctx) => {
  const info = ctx.http?.authInfo;
  if (!info) throw new Error("Authentification Kelo Social requise.");

  const extra = info.extra || {};
  const auth: KeloMcpAuth = {
    accessToken: info.token,
    did: String(extra.keloDid || ""),
    handle: String(extra.keloHandle || ""),
    pdsUrl: String(extra.keloPdsUrl || ""),
  };

  if (!auth.did || !auth.pdsUrl) throw new Error("Contexte utilisateur Kelo Social incomplet.");
  return buildKeloMcpServer(auth);
});

async function serve(request: Request) {
  const auth = await authGate(request);
  if (auth instanceof Response) return auth;
  return handler.fetch(request, { authInfo: auth });
}

export async function GET(request: Request) {
  return serve(request);
}

export async function POST(request: Request) {
  return serve(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://www.kelosocial.eu",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}
