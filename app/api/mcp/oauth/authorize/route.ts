import { NextResponse } from "next/server";
import { createAuthorizationCode, createMcpLoginChallenge, loginForMcp, readMcpLoginChallenge, readMcpSignupChallenge, resolveClientMetadata, validateRedirect } from "@/lib/mcp/oauth";
import { extractPdsUrl, resolveDidDocument } from "@/lib/atproto/discovery";

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
    const cookie = request.headers.get("cookie") || "";
    const rawSignup = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("kelo_mcp_signup="))?.slice("kelo_mcp_signup=".length);
    if (rawSignup) {
      const signup = readMcpSignupChallenge(decodeURIComponent(rawSignup));
      if (signup && signup.clientId === clientId && signup.redirectUri === redirectUri && signup.codeChallenge === codeChallenge) {
        const metadata = await resolveClientMetadata(clientId);
        validateRedirect(metadata, redirectUri);
        const pdsUrl = extractPdsUrl(await resolveDidDocument(signup.did));
        const code = createAuthorizationCode({
          clientId, redirectUri, codeChallenge, scope: signup.scope,
          did: signup.did, handle: signup.handle, accessJwt: signup.accessJwt,
          refreshJwt: signup.refreshJwt, pdsUrl,
        });
        const callback = new URL(redirectUri);
        callback.searchParams.set("code", code);
        if (state) callback.searchParams.set("state", state);
        callback.searchParams.set("iss", new URL(request.url).origin);
        const response = NextResponse.redirect(callback);
        response.headers.append("Set-Cookie", "kelo_mcp_signup=; Max-Age=0; Path=/api/mcp/oauth/authorize; HttpOnly; Secure; SameSite=Lax");
        return response;
      }
    }

    const metadata = await resolveClientMetadata(clientId);
    validateRedirect(metadata, redirectUri);
    if (responseType !== "code") throw new Error("response_type code obligatoire.");
    if (!codeChallenge || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) throw new Error("PKCE S256 est obligatoire.");

    const allowed = new Set(["kelo:read", "kelo:write"]);
    const scope = requestedScope.split(/\s+/).filter(Boolean).filter((item) => allowed.has(item));
    if (!scope.includes("kelo:read")) scope.unshift("kelo:read");
    const scopeValue = [...new Set(scope)].join(" ");

    return renderLoginPage(request, {
      clientId,
      redirectUri,
      responseType,
      state,
      codeChallenge,
      scopeValue,
    });
  } catch (error) {
    return errorPage("Autorisation Kelo Social impossible", error instanceof Error ? error.message : "Erreur OAuth", 400);
  }
}

function errorPage(title: string, message: string, status: number) {
  return new NextResponse(
    "<!doctype html><html lang='fr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>" +
      escape(title) +
      "</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f7fb;font-family:system-ui,sans-serif;color:#171923}.card{width:min(480px,calc(100% - 32px));padding:30px;border-radius:24px;background:#fff;border:1px solid #e7e9f0;box-shadow:0 20px 60px rgba(30,35,55,.1)}h1{margin:0 0 12px;font-size:24px}p{color:#686d7d;line-height:1.55}</style></head><body><main class='card'><h1>" +
      escape(title) +
      "</h1><p>" +
      escape(message) +
      "</p></main></body></html>",
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function renderLoginPage(
  request: Request,
  values: { clientId: string; redirectUri: string; responseType: string; state: string; codeChallenge: string; scopeValue: string },
  options: { error?: string } = {},
) {
  const { clientId, redirectUri, responseType, state, codeChallenge, scopeValue } = values;
  const scope = new Set(scopeValue.split(/\s+/).filter(Boolean));
  const hidden = (name: string, value: string) =>
    "<input type='hidden' name='" + escape(name) + "' value='" + escape(value) + "'>";
  const hiddenInputs =
    hidden("client_id", clientId) +
    hidden("redirect_uri", redirectUri) +
    hidden("response_type", responseType) +
    hidden("state", state) +
    hidden("code_challenge", codeChallenge) +
    hidden("scope", scopeValue);

  const permissions =
    (scope.has("kelo:read")
      ? "<div class='permission'><div class='check'>✓</div><div><b>Lire Kelo Social</b><small>Consulter votre profil, vos publications et les données nécessaires à l’application.</small></div></div>"
      : "") +
    (scope.has("kelo:write")
      ? "<div class='permission write'><div class='check'>✓</div><div><b>Agir sur Kelo Social</b><small>Publier ou effectuer les actions demandées par vous via l’application.</small></div></div>"
      : "");

  const error = options.error
    ? "<div class='error'>" + escape(options.error) + "</div>"
    : "";

  const logoUrl = "https://kelosocial.sirv.com/logo.png";
  const signupHref = "/signup?oauth_return=" + encodeURIComponent(request.url.split("?")[0] + "?" + new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: responseType, state, code_challenge: codeChallenge, scope: scopeValue }).toString());
  const html =
    "<!doctype html><html lang='fr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Autorisation · Kelo Social</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;color:#151722}.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px 16px}.card{width:min(520px,100%);background:#fff;border:1px solid #e8eaf0;border-radius:28px;box-shadow:0 24px 80px rgba(31,35,52,.12);overflow:hidden}.top{padding:28px 28px 22px;text-align:center;border-bottom:1px solid #eef0f5}.logo{width:58px;height:58px;border-radius:17px;display:block;margin:0 auto 16px;object-fit:cover}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b6f80;margin-bottom:8px}h1{font-size:26px;line-height:1.15;margin:0 0 10px;letter-spacing:-.02em}.subtitle{margin:0;color:#666b7a;line-height:1.5;font-size:15px}.app{margin:22px 28px 0;padding:16px 17px;border:1px solid #e7e9f0;border-radius:18px;background:#fafbfe;display:flex;align-items:center;gap:13px}.app-icon{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#2563ff,#8b5cff);display:flex;align-items:center;justify-content:center;color:white;font-weight:900}.app strong{display:block;font-size:15px}.app span{display:block;color:#737788;font-size:13px;margin-top:3px}.content{padding:24px 28px 28px}.section-title{font-size:14px;font-weight:800;margin:0 0 12px}.permission{display:flex;gap:14px;align-items:flex-start;padding:15px 16px;border:1px solid #e5e7ee;border-radius:17px;margin:10px 0;background:#fff}.permission.write{border-color:#ddd6fe;background:#fbf9ff}.check{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#2563ff,#8b5cff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex:none;margin-top:1px}.permission b{font-size:14px}.permission small{display:block;color:#717687;line-height:1.45;margin-top:4px;font-size:12.5px}.note{margin:16px 0 20px;padding:12px 14px;border-radius:14px;background:#f5f7fb;color:#666b7a;font-size:12.5px;line-height:1.45}.error{margin:0 0 16px;padding:12px 14px;border-radius:14px;background:#fff2f2;color:#a22626;border:1px solid #ffd9d9;font-size:13px;line-height:1.45}label{display:block;font-size:13px;font-weight:700;margin:14px 0 6px}input[type=text],input[type=password]{display:block;width:100%;height:46px;border:1px solid #dfe2ea;border-radius:13px;padding:0 13px;font:inherit;background:#fff;outline:none}input:focus{border-color:#7c67ff;box-shadow:0 0 0 3px rgba(124,103,255,.12)}button{width:100%;height:48px;margin-top:18px;border:0;border-radius:14px;background:linear-gradient(90deg,#2563ff,#8b5cff);color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 8px 20px rgba(76,74,210,.2)}.signup{display:block;text-align:center;margin-top:12px;padding:12px;border-radius:13px;color:#3e43a8;text-decoration:none;font-size:13px;font-weight:700}.security{margin:18px 0 0;text-align:center;color:#858a99;font-size:11.5px;line-height:1.5}.footer{padding:14px 28px 20px;text-align:center;color:#a0a4b0;font-size:11px;border-top:1px solid #f0f1f5}@media(max-width:480px){.page{padding:0}.card{border-radius:0;min-height:100vh;border:0}.top{padding:30px 22px 22px}.app,.content{margin-left:20px;margin-right:20px}.content{padding-left:0;padding-right:0}.footer{padding-left:20px;padding-right:20px}}</style></head><body><main class='page'><section class='card'><header class='top'><img class='logo' src='" +
    escape(logoUrl) +
    "' alt='Kelo Social'><div class='eyebrow'>Autorisation sécurisée</div><h1>Se connecter à Kelo Social</h1><p class='subtitle'>Connectez votre compte pour autoriser une application IA ou un service compatible.</p></header><div class='app'><div class='app-icon'>K</div><div><strong>Kelo Social</strong><span>Autorisation d’une application compatible</span></div></div><div class='content'><h2 class='section-title'>Autorisations demandées</h2>" +
    permissions +
    "<div class='note'><b>Vous gardez le contrôle.</b> L’application ne reçoit que les autorisations que vous acceptez. Les fonctions d’administration, de certification et de modération ne font pas partie des autorisations normales.</div>" +
    error +
    "<form method='post'>" +
    hiddenInputs +
    "<label for='identifier'>Identifiant Kelo Social</label><input id='identifier' name='identifier' type='text' autocomplete='username' placeholder='@votrecompte ou adresse e-mail' required><label for='password'>Mot de passe</label><input id='password' name='password' type='password' autocomplete='current-password' placeholder='Votre mot de passe' required><button type='submit'>Continuer</button></form><a class='signup' href='${escape(signupHref)}'>Je n’ai pas encore de compte → Créer un compte</a><p class='security'>🔒 Votre mot de passe sert uniquement à établir votre connexion Kelo Social. Après validation, l’application utilise une autorisation OAuth + PKCE.</p></div><div class='footer'>Kelo Social · Autorisation sécurisée</div></section></main></body></html>";

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function renderFactorPage(
  values: { clientId: string; redirectUri: string; responseType: string; state: string; codeChallenge: string; scopeValue: string },
  error?: string,
) {
  const hidden = (name: string, value: string) =>
    "<input type='hidden' name='" + escape(name) + "' value='" + escape(value) + "'>";
  const hiddenInputs =
    hidden("client_id", values.clientId) +
    hidden("redirect_uri", values.redirectUri) +
    hidden("response_type", values.responseType) +
    hidden("state", values.state) +
    hidden("code_challenge", values.codeChallenge) +
    hidden("scope", values.scopeValue);
  const errorHtml = error
    ? "<div class='error'>" + escape(error) + "</div>"
    : "";
  const html =
    "<!doctype html><html lang='fr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Code de sécurité · Kelo Social</title><style>body{margin:0;min-height:100vh;background:#f5f7fb;font-family:system-ui,sans-serif;color:#151722;display:grid;place-items:center;padding:18px}.card{width:min(460px,100%);background:#fff;border:1px solid #e7e9f0;border-radius:26px;padding:30px;box-shadow:0 24px 70px rgba(31,35,52,.12);text-align:center}.logo{width:60px;height:60px;border-radius:18px;object-fit:cover;margin-bottom:16px}h1{font-size:24px;margin:0 0 10px}p{color:#6c7180;line-height:1.5;font-size:14px}.error{margin:16px 0;padding:12px;border-radius:12px;background:#fff2f2;color:#a22626;border:1px solid #ffd9d9;font-size:13px}label{display:block;text-align:left;font-weight:700;font-size:13px;margin:22px 0 7px}input{width:100%;height:50px;border:1px solid #dfe2ea;border-radius:13px;text-align:center;font-size:20px;letter-spacing:.22em;box-sizing:border-box}button{width:100%;height:48px;border:0;border-radius:14px;margin-top:18px;background:linear-gradient(90deg,#2563ff,#8b5cff);color:#fff;font-weight:800;font-size:15px}</style></head><body><main class='card'><img class='logo' src='https://kelosocial.sirv.com/logo.png' alt='Kelo Social'><h1>Code de sécurité</h1><p>Vos identifiants sont corrects. Un code de sécurité a été demandé par votre compte Kelo Social. Saisissez le code reçu par e-mail pour continuer.</p>" +
    errorHtml +
    "<form method='post'>" +
    hiddenInputs +
    "<input type='hidden' name='factor_step' value='1'><label for='auth_factor_token'>Code reçu par e-mail</label><input id='auth_factor_token' name='auth_factor_token' type='text' inputmode='numeric' autocomplete='one-time-code' maxlength='12' required autofocus><button type='submit'>Valider le code</button></form></main></body></html>";
  return new NextResponse(html, { status: error ? 401 : 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const clientId = String(form.get("client_id") || "");
  const redirectUri = String(form.get("redirect_uri") || "");
  const responseType = String(form.get("response_type") || "code");
  const state = String(form.get("state") || "");
  const codeChallenge = String(form.get("code_challenge") || "");
  const requestedScope = String(form.get("scope") || "kelo:read kelo:write");
  const factorStep = form.get("factor_step") === "1";
  const authFactorToken = String(form.get("auth_factor_token") || "").trim();

  try {
    const metadata = await resolveClientMetadata(clientId);
    validateRedirect(metadata, redirectUri);
    if (responseType !== "code") throw new Error("response_type code obligatoire.");
    if (!codeChallenge || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) throw new Error("PKCE S256 est obligatoire.");

    const allowed = new Set(["kelo:read", "kelo:write"]);
    const requested = requestedScope.split(/\s+/).filter(Boolean).filter((item) => allowed.has(item));
    if (!requested.includes("kelo:read")) requested.unshift("kelo:read");
    const allowWrite = requested.includes("kelo:write");
    const scope = [...new Set(requested.filter((item) => item !== "kelo:write" || allowWrite))].join(" ");
    const values = { clientId, redirectUri, responseType, state, codeChallenge, scopeValue: scope };

    let identifier = String(form.get("identifier") || "").trim();
    let password = String(form.get("password") || "");

    if (factorStep) {
      const challenge = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith("kelo_mcp_login="))?.slice("kelo_mcp_login=".length);
      if (!challenge) return errorPage("Code de sécurité expiré", "Recommencez la connexion depuis votre application.", 400);
      const decoded = readMcpLoginChallenge(decodeURIComponent(challenge));
      if (!decoded) return errorPage("Code de sécurité expiré", "Recommencez la connexion depuis votre application.", 400);
      if (decoded.clientId !== clientId || decoded.redirectUri !== redirectUri || decoded.codeChallenge !== codeChallenge) {
        return errorPage("Demande OAuth invalide", "La demande d’autorisation ne correspond plus à la connexion en cours.", 400);
      }
      identifier = decoded.identifier;
      password = decoded.password;
      if (!authFactorToken) return renderFactorPage(values, "Saisissez le code reçu par e-mail.");
    }

    let user;
    try {
      user = await loginForMcp(identifier, password, authFactorToken || undefined);
    } catch (error) {
      const raw = error as any;
      const message = error instanceof Error ? error.message : "Connexion impossible.";
      const isRateLimit = /RateLimitExceeded|rate.?limit|429/i.test(message) || raw?.status === 429;
      if (isRateLimit) {
        const response = errorPage("Trop de tentatives", "Kelo Social limite temporairement les nouvelles connexions pour protéger votre compte. Attendez quelques instants avant de réessayer.", 429);
        response.headers.set("Retry-After", "60");
        return response;
      }
      const isFactor = /AuthFactorTokenRequired|auth.?factor|verification code|login code|code de connexion/i.test(message) || raw?.error === "AuthFactorTokenRequired";
      if (isFactor && !factorStep) {
        const challenge = createMcpLoginChallenge({
          identifier,
          password,
          clientId,
          redirectUri,
          scope,
          codeChallenge,
          state,
        });
        const response = renderFactorPage(values);
        response.headers.append("Set-Cookie", "kelo_mcp_login=" + encodeURIComponent(challenge) + "; Max-Age=300; Path=/api/mcp/oauth/authorize; HttpOnly; Secure; SameSite=Lax");
        return response;
      }
      if (factorStep) return renderFactorPage(values, "Le code de sécurité est incorrect ou expiré. Vérifiez l’e-mail reçu puis réessayez.");
      throw error;
    }

    const code = createAuthorizationCode({ clientId, redirectUri, codeChallenge, scope, ...user });
    const callback = new URL(redirectUri);
    callback.searchParams.set("code", code);
    if (state) callback.searchParams.set("state", state);
    callback.searchParams.set("iss", new URL(request.url).origin);
    const response = NextResponse.redirect(callback);
    response.headers.append("Set-Cookie", "kelo_mcp_login=; Max-Age=0; Path=/api/mcp/oauth/authorize; HttpOnly; Secure; SameSite=Lax");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de connexion";
    const isRateLimit = /RateLimitExceeded|rate.?limit|429/i.test(message);
    return errorPage(isRateLimit ? "Trop de tentatives" : "Connexion Kelo Social impossible", isRateLimit ? "Kelo Social limite temporairement les nouvelles connexions. Attendez quelques instants avant de réessayer." : message, isRateLimit ? 429 : 400);
  }
}
