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

    const clientName = escape(metadata.client_name || "Application compatible");
    const logoUrl = "https://kelosocial.sirv.com/logo.png";
    const readPermission = "<div class='permission'><div class='check'>✓</div><div><b>Lire Kelo Social</b><small>Consulter votre profil, vos publications et les données nécessaires à l’application.</small></div></div>";
    const writePermission = "<div class='permission write'><div class='check'>✓</div><div><b>Agir sur Kelo Social</b><small>Publier ou effectuer les actions demandées par vous via l’application.</small></div></div>";
    const permissionsHtml = (scope.includes("kelo:read") ? readPermission : "") + (scope.includes("kelo:write") ? writePermission : "");
    const html = "<!doctype html><html lang='fr'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Autorisation · Kelo Social</title><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f7fb;color:#151722}.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px 16px}.card{width:min(520px,100%);background:#fff;border:1px solid #e8eaf0;border-radius:28px;box-shadow:0 24px 80px rgba(31,35,52,.12);overflow:hidden}.top{padding:28px 28px 22px;text-align:center;border-bottom:1px solid #eef0f5}.logo{width:58px;height:58px;border-radius:17px;display:block;margin:0 auto 16px;object-fit:cover}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b6f80;margin-bottom:8px}h1{font-size:26px;line-height:1.15;margin:0 0 10px;letter-spacing:-.02em}.subtitle{margin:0;color:#666b7a;line-height:1.5;font-size:15px}.app{margin:22px 28px 0;padding:16px 17px;border:1px solid #e7e9f0;border-radius:18px;background:#fafbfe;display:flex;align-items:center;gap:13px}.app-icon{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#2563ff,#8b5cff);display:flex;align-items:center;justify-content:center;color:white;font-weight:900}.app strong{display:block;font-size:15px}.app span{display:block;color:#737788;font-size:13px;margin-top:3px}.content{padding:24px 28px 28px}.section-title{font-size:14px;font-weight:800;margin:0 0 12px}.permission{display:flex;gap:14px;align-items:flex-start;padding:15px 16px;border:1px solid #e5e7ee;border-radius:17px;margin:10px 0;background:#fff}.permission.write{border-color:#ddd6fe;background:#fbf9ff}.check{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#2563ff,#8b5cff);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex:none;margin-top:1px}.permission b{font-size:14px}.permission small{display:block;color:#717687;line-height:1.45;margin-top:4px;font-size:12.5px}.note{margin:16px 0 20px;padding:12px 14px;border-radius:14px;background:#f5f7fb;color:#666b7a;font-size:12.5px;line-height:1.45}label{display:block;font-size:13px;font-weight:700;margin:14px 0 6px}input[type=text],input[type=password]{display:block;width:100%;height:46px;border:1px solid #dfe2ea;border-radius:13px;padding:0 13px;font:inherit;background:#fff;outline:none}input:focus{border-color:#7c67ff;box-shadow:0 0 0 3px rgba(124,103,255,.12)}button{width:100%;height:48px;margin-top:18px;border:0;border-radius:14px;background:linear-gradient(90deg,#2563ff,#8b5cff);color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 8px 20px rgba(76,74,210,.2)}.signup{display:block;text-align:center;margin-top:12px;padding:12px;border-radius:13px;color:#3e43a8;text-decoration:none;font-size:13px;font-weight:700}.security{margin:18px 0 0;text-align:center;color:#858a99;font-size:11.5px;line-height:1.5}.footer{padding:14px 28px 20px;text-align:center;color:#a0a4b0;font-size:11px;border-top:1px solid #f0f1f5}@media(max-width:480px){.page{padding:0}.card{border-radius:0;min-height:100vh;border:0}.top{padding:30px 22px 22px}.app,.content{margin-left:20px;margin-right:20px}.content{padding-left:0;padding-right:0}.footer{padding-left:20px;padding-right:20px}}</style></head><body><main class='page'><section class='card'><header class='top'><img class='logo' src='__LOGO__' alt='Kelo Social'><div class='eyebrow'>Autorisation sécurisée</div><h1>Connecter __CLIENT__</h1><p class='subtitle'>Cette application souhaite accéder à votre compte Kelo Social.</p></header><div class='app'><div class='app-icon'>K</div><div><strong>__CLIENT__</strong><span>Application compatible avec Kelo Social</span></div></div><div class='content'><h2 class='section-title'>Ce que l’application pourra faire</h2>__PERMISSIONS__<div class='note'><b>Vous gardez le contrôle.</b> Seules les autorisations demandées et acceptées sont accordées. Les fonctions d’administration, de certification et de modération ne font pas partie des autorisations normales.</div><form method='post'>__HIDDEN__<label for='identifier'>Identifiant Kelo Social</label><input id='identifier' name='identifier' type='text' autocomplete='username' placeholder='@votrecompte ou adresse e-mail' required><label for='password'>Mot de passe</label><input id='password' name='password' type='password' autocomplete='current-password' placeholder='Votre mot de passe' required><label for='auth_factor_token'>Code de sécurité <span style='font-weight:500;color:#858a99'>(si demandé)</span></label><input id='auth_factor_token' name='auth_factor_token' type='text' inputmode='numeric' autocomplete='one-time-code' placeholder='Laissez vide si aucun code n’est demandé'><button type='submit'>Continuer avec Kelo Social</button></form><a class='signup' href='__SIGNUP__'>Je n’ai pas encore de compte → Créer un compte</a><p class='security'>🔒 Votre mot de passe est utilisé uniquement pour vous connecter à Kelo Social. L’autorisation est ensuite accordée via OAuth + PKCE.</p></div><div class='footer'>Kelo Social · Autorisation OAuth sécurisée</div></section></main></body></html>";
    const hiddenInputs = hidden("client_id",clientId)+hidden("redirect_uri",redirectUri)+hidden("response_type",responseType)+hidden("state",state)+hidden("code_challenge",codeChallenge)+hidden("scope",scopeValue);
    const htmlFinal = html.replace("__LOGO__", escape(logoUrl)).replaceAll("__CLIENT__", clientName).replace("__PERMISSIONS__", permissionsHtml).replace("__HIDDEN__", hiddenInputs).replace("__SIGNUP__", escape(signupUrl.toString()));
    return new NextResponse(htmlFinal, { headers: { "Content-Type": "text/html; charset=utf-8" } });
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
