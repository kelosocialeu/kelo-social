import { createHmac, timingSafeEqual } from "node:crypto";
import { createAtpAgent } from "@/lib/atproto/client";
import { discoverAccount, extractPdsUrl, resolveDidDocument } from "@/lib/atproto/discovery";

const DEFAULT_SCOPES = ["kelo:read", "kelo:write"];
const ACCESS_TTL = 15 * 60;
const REFRESH_TTL = 60 * 60 * 24 * 30;

type ClientMetadata = { client_id?: string; client_name?: string; redirect_uris: string[]; grant_types?: string[]; response_types?: string[]; token_endpoint_auth_method?: string; scope?: string; };
type OAuthClaims = { kind: "client" | "code" | "access" | "refresh"; exp: number; [key: string]: any; };

function secret() { const value = process.env.MCP_OAUTH_SECRET; if (!value || value.length < 32) throw new Error("MCP_OAUTH_SECRET doit contenir au moins 32 caractères."); return value; }
function b64(value: string) { return Buffer.from(value).toString("base64url"); }
function unb64(value: string) { return Buffer.from(value, "base64url").toString("utf8"); }
function signPayload(payload: Record<string, unknown>) { const body = b64(JSON.stringify(payload)); const signature = createHmac("sha256", secret()).update(body).digest("base64url"); return "kelo_" + body + "." + signature; }
function readSigned<T extends OAuthClaims>(token: string): T | null { try { if (!token.startsWith("kelo_")) return null; const parts = token.slice(5).split("."); const body = parts[0]; const signature = parts[1]; if (!body || !signature) return null; const expected = createHmac("sha256", secret()).update(body).digest("base64url"); const a = Buffer.from(signature); const b = Buffer.from(expected); if (a.length !== b.length || !timingSafeEqual(a, b)) return null; const payload = JSON.parse(unb64(body)) as T; if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null; return payload; } catch { return null; } }
function origin(request: Request) { return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin; }

export function protectedResourceMetadata(request: Request) { const base = origin(request); return { resource: base + "/api/mcp", authorization_servers: [base], scopes_supported: DEFAULT_SCOPES, bearer_methods_supported: ["header"] }; }
export function authorizationServerMetadata(request: Request) { const base = origin(request); return { issuer: base, authorization_endpoint: base + "/api/mcp/oauth/authorize", token_endpoint: base + "/api/mcp/oauth/token", registration_endpoint: base + "/api/mcp/oauth/register", response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"], code_challenge_methods_supported: ["S256"], token_endpoint_auth_methods_supported: ["none"], scopes_supported: DEFAULT_SCOPES, client_id_metadata_document_supported: true, authorization_response_iss_parameter_supported: true }; }
export function encodeClientMetadata(metadata: ClientMetadata) { return signPayload({ kind: "client", exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 5, metadata }); }
export function decodeClientMetadata(clientId: string): ClientMetadata | null { const payload = readSigned<any>(clientId); return payload?.kind === "client" ? payload.metadata as ClientMetadata : null; }
export async function resolveClientMetadata(clientId: string): Promise<ClientMetadata> {
  const local = decodeClientMetadata(clientId);
  if (local) return local;
  if (!/^https:\/\/[^\s]+$/.test(clientId)) throw new Error("client_id invalide.");
  const response = await fetch(clientId, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Impossible de récupérer les métadonnées du client MCP.");
  const metadata = await response.json() as ClientMetadata;
  if (!Array.isArray(metadata.redirect_uris) || !metadata.redirect_uris.length) throw new Error("Le client MCP ne déclare aucune redirect_uri.");
  return { ...metadata, client_id: clientId };
}
export function validateRedirect(metadata: ClientMetadata, redirectUri: string) {
  if (!metadata.redirect_uris.includes(redirectUri)) throw new Error("redirect_uri non autorisée pour ce client MCP.");
  const url = new URL(redirectUri);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") throw new Error("La redirect_uri doit utiliser HTTPS.");
}
export function createAuthorizationCode(input: { clientId:string; redirectUri:string; codeChallenge:string; scope:string; accessJwt:string; refreshJwt:string; did:string; handle:string; pdsUrl:string; }) { return signPayload({ kind:"code", exp:Math.floor(Date.now()/1000)+300, ...input }); }
export function readAuthorizationCode(code: string) { const payload = readSigned<any>(code); return payload?.kind === "code" ? payload : null; }
export function createAccessToken(input: { did:string; handle:string; pdsUrl:string; accessJwt:string; scope:string }) { const now=Math.floor(Date.now()/1000); return signPayload({kind:"access", exp:now+ACCESS_TTL, iat:now, ...input}); }
export function createRefreshToken(input: { did:string; handle:string; pdsUrl:string; refreshJwt:string; scope:string }) { const now=Math.floor(Date.now()/1000); return signPayload({kind:"refresh", exp:now+REFRESH_TTL, iat:now, ...input}); }
export function verifyMcpAccessToken(token:string) { const payload=readSigned<any>(token); return payload?.kind==="access" ? payload : null; }
export function verifyMcpRefreshToken(token:string) { const payload=readSigned<any>(token); return payload?.kind==="refresh" ? payload : null; }
export async function loginForMcp(identifier:string,password:string) {
  const discovered=await discoverAccount(identifier);
  const agent=createAtpAgent(discovered.pdsUrl);
  await agent.login({identifier:discovered.identifier,password});
  if(!agent.session) throw new Error("Le PDS n'a pas retourné de session.");
  const document=await resolveDidDocument(agent.session.did);
  const pdsUrl=extractPdsUrl(document);
  return {did:agent.session.did,handle:agent.session.handle,accessJwt:agent.session.accessJwt,refreshJwt:agent.session.refreshJwt,pdsUrl};
}
export async function refreshMcpUser(refreshJwt:string,pdsUrl:string,did:string) {
  const response=await fetch(pdsUrl.replace(/\/$/,"")+"/xrpc/com.atproto.server.refreshSession",{method:"POST",headers:{Authorization:"Bearer "+refreshJwt,Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(12000)});
  if(!response.ok) throw new Error("La session Kelo Social a expiré. Reconnectez votre compte.");
  const session=await response.json();
  if(session.did!==did) throw new Error("La session renouvelée ne correspond pas au compte.");
  return {did:session.did,handle:session.handle,accessJwt:session.accessJwt,refreshJwt:session.refreshJwt,pdsUrl};
}
export function createOAuthAccessTokenResponse(user:any,scope:string) { return {access_token:createAccessToken({did:user.did,handle:user.handle,pdsUrl:user.pdsUrl,accessJwt:user.accessJwt,scope}),token_type:"Bearer",expires_in:ACCESS_TTL,scope,refresh_token:createRefreshToken({did:user.did,handle:user.handle,pdsUrl:user.pdsUrl,refreshJwt:user.refreshJwt,scope})}; }
