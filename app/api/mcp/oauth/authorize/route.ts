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
  const requestedScope = params.get("scope") || "kelo:read kelo:write";

  try {
    const metadata = await resolveClientMetadata(clientId);
    validateRedirect(metadata, redirectUri);
    if (responseType !== "code") throw new Error("response_type code obligatoire.");
    if (!codeChallenge || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) throw new Error("PKCE S256 est obligatoire.");

    const allowed = new Set(["kelo:read", "kelo:write"]);
    const scope = requestedScope.split(/\s+/).filter(Boolean).filter((item) => allowed.has(item));
    if (!scope.includes("kelo:read")) scope.unshift("kelo:read");
    const scopeValue = [...new Set(scope)].join(" ");

    const hidden = (name: string, value: string) =>
      "<input type='hidden' name='"+escape(name)+"' value='"+escape(value)+"'>";
    const permissionRows = [
      scope.includes("kelo:read")
        ? "<label class='permission'><input type='checkbox' checked disabled><span><b>Lire Kelo Social</b><small>Consulter votre profil, vos publications et les données nécessaires à l'agent IA.</small></span></label>"
        : "",
      scope.includes("kelo:write")
        ? "<label class='permission'><input type='checkbox' checked name='allow_write' value='1'><span><b>Agir sur Kelo Social</b><small>Publier ou effectuer les actions demandées par vous via l'agent IA.</small></span></label>"
        : "",
    ].join("");

    const signupUrl = new URL("/signup", request.url);
    signupUrl.searchParams.set("mcp_oauth", "1");
    signupUrl.searchParams.set("client_id", clientId);
    signupUrl.searchParams.set("redirect_uri", redirectUri);
    signupUrl.searchParams.set("response_type", responseType);
    signupUrl.searchParams.set("state", state);
    signupUrl.searchParams.set("code_challenge", codeChallenge);
    signupUrl.searchParams.set("scope", scopeValue);

    const html = "<!doctype html><html lang='fr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Connexion MCP · Kelo Social</title><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;background:linear-gradient(135deg,#f7f8ff,#f7f3ff);color:#18181b}main{max-width:460px;margin:5vh auto;padding:32px;background:white;border-radius:28px;box-shadow:0 20px 70px #0001}h1{margin:0 0 8px}p{color:#666;line-height:1.5}.client{padding:14px 16px;border-radius:18px;background:#f7f7fb;margin:18px 0}.permission{display:flex;gap:12px;align-items:flex-start;padding:14px;border:1px solid #e7e7ef;border-radius:16px;margin:10px 0}.permission input{margin-top:4px}.permission small{display:block;color:#777;margin-top:4px;line-height:1.4}input[type=text],input[type=password]{width:100%;box-sizing:border-box;padding:13px;margin:7px 0 14px;border:1px solid #ddd;border-radius:12px}button{width:100%;padding:14px;border:0;border-radius:14px;background:linear-gradient(90deg,#2563ff,#8b5cff);color:white;font-weight:800;cursor:pointer}.secondary{display:block;text-align:center;margin-top:12px;padding:13px;border-radius:14px;background:#f4f4f7;color:#18181b;text-decoration:none;font-weight:700}.security{font-size:13px;color:#777;margin-top:14px}.error{padding:12px 14px;border-radius:14px;background:#fff1f2;color:#b42318;font-size:14px}</style></head><body><main><h1>Se connecter à Kelo Social</h1><p>Autorisez <b>"+escape(metadata.client_name || "un agent IA")+"</b> à utiliser Kelo Social en votre nom.</p><div class='client'><b>Compte Kelo Social</b><br><span>Handle ou adresse e-mail + mot de passe</span></div><h3>Autorisations</h3>"+permissionRows+"<form method='post'>"+hidden("client_id",clientId)+hidden("redirect_uri",redirectUri)+hidden("response_type",responseType)+hidden("state",state)+hidden("code_challenge",codeChallenge)+hidden("scope",scopeValue)+"<label>Handle ou adresse e-mail</label><input name='identifier' autocomplete='username' required><label>Mot de passe</label><input name='password' type='password' autocomplete='current-password' required><label>Code de sécurité (si demandé)</label><input name='auth_factor_token' inputmode='numeric' autocomplete='one-time-code' placeholder='Laissez vide si aucun code n’est demandé'><button type='submit'>Autoriser avec Kelo Social</button></form><a class='secondary' href='"+escape(signupUrl.toString())+"'>Créer un compte Kelo Social</a><p class='security'>🔒 Le mot de passe est transmis uniquement à Kelo Social pour authentifier votre compte. Le code de sécurité n'est demandé que si une vérification supplémentaire est activée.</p></main></body></html>";
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    return new NextResponse("<!doctype html><h1>Connexion MCP impossible</h1><p>"+escape(error instanceof Error ? error.message : "Erreur OAuth")+"</p>", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const clientId = String(form.get("client_id") || "");
  const redirectUri = String(form.get("redirect_uri") || "");
  const responseType = String(form.get("response_type") || "code");
  const state = String(form.get("state") || "");
  const codeChallenge = String(form.get("code_challenge") || "");
  const identifier = String(form.get("identifier") || "").trim();
  const password = String(form.get("password") || "");
  const authFactorToken = String(form.get("auth_factor_token") || "").trim();
  const requestedScope = String(form.get("scope") || "kelo:read kelo:write");
  const allowWrite = form.get("allow_write") === "1";

  try {
    const metadata = await resolveClientMetadata(clientId);
    validateRedirect(metadata, redirectUri);
    if (responseType !== "code") throw new Error("response_type code obligatoire.");
    if (!codeChallenge || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) throw new Error("PKCE S256 est obligatoire.");

    const allowed = new Set(["kelo:read", "kelo:write"]);
    const requested = requestedScope.split(/\s+/).filter(Boolean).filter((item) => allowed.has(item));
    if (!requested.includes("kelo:read")) requested.unshift("kelo:read");
    const scope = [...new Set(requested.filter((item) => item !== "kelo:write" || allowWrite))].join(" ");

    let user;
    try {
      user = await loginForMcp(identifier, password, authFactorToken || undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connexion impossible.";
      const isFactor = /auth.?factor|verification code|login code|code de connexion/i.test(message);
      if (isFactor) {
        return new NextResponse("<!doctype html><h1>Code de sécurité requis</h1><p>Un code de sécurité a été demandé par votre compte Kelo Social. Revenez en arrière et saisissez le code reçu, puis validez à nouveau.</p><p>Le code peut être envoyé par le mécanisme de sécurité configuré pour votre compte.</p>", { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      throw error;
    }

    const code = createAuthorizationCode({ clientId, redirectUri, codeChallenge, scope, ...user });
    const callback = new URL(redirectUri);
    callback.searchParams.set("code", code);
    if (state) callback.searchParams.set("state", state);
    callback.searchParams.set("iss", new URL(request.url).origin);
    return NextResponse.redirect(callback);
  } catch (error) {
    return new NextResponse("<!doctype html><h1>Connexion Kelo Social impossible</h1><p>"+escape(error instanceof Error ? error.message : "Erreur de connexion")+"</p><p>Vous pouvez fermer cette fenêtre et recommencer depuis votre client MCP.</p>", { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}
