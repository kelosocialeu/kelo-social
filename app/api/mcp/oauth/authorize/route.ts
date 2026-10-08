import { NextResponse } from "next/server";
import { createAuthorizationCode, loginForMcp, resolveClientMetadata, validateRedirect } from "@/lib/mcp/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]!));
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const responseType = params.get("response_type") || "";
  const state = params.get("state") || "";
  const codeChallenge = params.get("code_challenge") || "";
  const scope = params.get("scope") || "kelo:read kelo:write";

  try {
    const metadata = await resolveClientMetadata(clientId);
    validateRedirect(metadata, redirectUri);
    if (responseType !== "code") throw new Error("response_type code obligatoire.");
    if (!codeChallenge || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) throw new Error("PKCE S256 est obligatoire.");

    const html = "<!doctype html><html lang='fr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Connexion MCP · Kelo Social</title><style>body{font-family:system-ui;margin:0;background:#f7f7fb;color:#18181b}main{max-width:440px;margin:8vh auto;padding:32px;background:white;border-radius:24px;box-shadow:0 15px 50px #0001}h1{margin-top:0}p{color:#666;line-height:1.5}input{width:100%;box-sizing:border-box;padding:13px;margin:7px 0 14px;border:1px solid #ddd;border-radius:12px}button{width:100%;padding:14px;border:0;border-radius:14px;background:linear-gradient(90deg,#2563ff,#8b5cff);color:white;font-weight:800;cursor:pointer}</style></head><body><main><h1>Connexion Kelo Social</h1><p><b>"+escape(metadata.client_name || "Un agent IA")+"</b> demande l'accès à votre compte Kelo Social.</p><p>L'agent pourra lire votre compte et effectuer les actions que vous lui demandez via Kelo Social.</p><form method='post'><input type='hidden' name='client_id' value='"+escape(clientId)+"'><input type='hidden' name='redirect_uri' value='"+escape(redirectUri)+"'><input type='hidden' name='state' value='"+escape(state)+"'><input type='hidden' name='code_challenge' value='"+escape(codeChallenge)+"'><input type='hidden' name='scope' value='"+escape(scope)+"'><label>Handle ou adresse e-mail</label><input name='identifier' autocomplete='username' required><label>Mot de passe</label><input name='password' type='password' autocomplete='current-password' required><button type='submit'>Autoriser avec Kelo Social</button></form></main></body></html>";
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    return new NextResponse("<!doctype html><h1>Connexion MCP impossible</h1><p>"+escape(error instanceof Error ? error.message : "Erreur OAuth")+"</p>", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
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
    const user = await loginForMcp(identifier, password);
    const code = createAuthorizationCode({ clientId, redirectUri, codeChallenge, scope, ...user });
    const callback = new URL(redirectUri);
    callback.searchParams.set("code", code);
    if (state) callback.searchParams.set("state", state);
    // RFC 9207: Claude advertises issuer validation, so the authorization response
    // must carry the exact issuer advertised by /.well-known/oauth-authorization-server.
    callback.searchParams.set("iss", new URL(request.url).origin);
    return NextResponse.redirect(callback);
  } catch (error) {
    return new NextResponse("<!doctype html><h1>Connexion Kelo Social impossible</h1><p>"+escape(error instanceof Error ? error.message : "Erreur de connexion")+"</p><p>Vous pouvez fermer cette fenêtre et recommencer depuis votre client MCP.</p>", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}
