import { createAtpAgent } from "@/lib/atproto/client";
import { AtprotoDiscoveryError, discoverAccount } from "@/lib/atproto/discovery";
import { sessionStorage } from "@/lib/session/session-storage";
import { AtpSession, LoginCredentials, SignupPayload } from "@/types/auth";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class AuthFactorRequiredError extends AuthError {
  constructor() {
    super(
      "Un code de connexion a été envoyé à votre adresse e-mail. Saisissez-le pour continuer."
    );
    this.name = "AuthFactorRequiredError";
  }
}

let cachedAgent: ReturnType<typeof createAtpAgent> | null = null;
let cachedSessionKey: string | null = null;
let pendingSessionRefresh: Promise<AtpSession> | null = null;

const BLUESKY_ENTRYWAY_URL = "https://bsky.social";
const LOGIN_TIMEOUT_MS = 20_000;
const SESSION_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new AuthError(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function getSessionKey(session: AtpSession) {
  return [session.did, session.pdsUrl, session.accessJwt, session.refreshJwt].join("|");
}

function clearCachedAgent() {
  cachedAgent = null;
  cachedSessionKey = null;
}

function saveSession(session: AtpSession) {
  sessionStorage.set(session);
  clearCachedAgent();
}

function normalizePdsUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function getLoginServiceForPds(pdsUrl: string) {
  try {
    const hostname = new URL(pdsUrl).hostname.toLowerCase();
    if (hostname === "bsky.social" || hostname.endsWith(".host.bsky.network")) {
      return BLUESKY_ENTRYWAY_URL;
    }
  } catch {}
  return normalizePdsUrl(pdsUrl);
}

function isDefinitelyExpiredSessionStatus(status: number) {
  return status === 400 || status === 401 || status === 403;
}

function isAuthFactorRequired(error: any) {
  const code = String(
    error?.error || error?.response?.data?.error || error?.data?.error || ""
  );
  const message = String(error?.message || "");
  return (
    code === "AuthFactorTokenRequired" ||
    /auth.?factor|verification code|login code/i.test(message)
  );
}

async function refreshAtProtocolSession(session: AtpSession): Promise<AtpSession> {
  if (pendingSessionRefresh) return pendingSessionRefresh;

  pendingSessionRefresh = (async () => {
    if (!session.refreshJwt) {
      throw new AuthError(
        "Votre session ne peut pas être renouvelée. Veuillez vous reconnecter."
      );
    }

    const service = getLoginServiceForPds(session.pdsUrl);
    let response: Response;

    try {
      response = await fetch(`${service}/xrpc/com.atproto.server.refreshSession`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.refreshJwt}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
      });
    } catch {
      throw new AuthError(
        "Le PDS met trop de temps à renouveler votre session. Réessayez dans un instant."
      );
    }

    if (!response.ok) {
      if (isDefinitelyExpiredSessionStatus(response.status)) {
        throw new AuthError("Votre session a expiré. Veuillez vous reconnecter.");
      }
      throw new Error(
        `Le PDS est temporairement indisponible pendant le renouvellement de session (${response.status}).`
      );
    }

    const data = (await response.json()) as any;
    if (!data.accessJwt || !data.refreshJwt || !data.handle || !data.did) {
      throw new AuthError("Le PDS a retourné une session incomplète.");
    }
    if (data.did !== session.did) {
      throw new AuthError("La session renouvelée ne correspond pas au compte connecté.");
    }

    const next: AtpSession = {
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt,
      handle: data.handle,
      did: data.did,
      pdsUrl: session.pdsUrl,
    };
    saveSession(next);
    return next;
  })();

  try {
    return await pendingSessionRefresh;
  } finally {
    pendingSessionRefresh = null;
  }
}

export async function login(credentials: LoginCredentials): Promise<AtpSession> {
  const identifier = credentials.identifier.trim().replace(/^@/, "").toLowerCase();
  if (!identifier) throw new AuthError("Veuillez saisir votre identifiant AT Protocol.");
  if (!credentials.password) throw new AuthError("Veuillez saisir votre mot de passe.");

  let discoveredAccount;
  try {
    discoveredAccount = await withTimeout(
      discoverAccount(identifier),
      LOGIN_TIMEOUT_MS,
      "La détection de votre compte AT Protocol prend trop de temps. Réessayez."
    );
  } catch (error) {
    if (error instanceof AtprotoDiscoveryError || error instanceof AuthError) {
      throw new AuthError(error.message);
    }
    throw new AuthError("Impossible de trouver le serveur PDS associé à ce compte.");
  }

  const loginService = getLoginServiceForPds(discoveredAccount.pdsUrl);
  const agent = createAtpAgent(loginService);

  try {
    await withTimeout(
      agent.login({
        identifier: discoveredAccount.identifier,
        password: credentials.password,
        ...(credentials.authFactorToken
          ? { authFactorToken: credentials.authFactorToken.trim() }
          : {}),
      } as any),
      LOGIN_TIMEOUT_MS,
      "Le serveur PDS met trop de temps à répondre. Réessayez dans un instant."
    );
  } catch (error: any) {
    console.error("AT Protocol login error:", {
      identifier: discoveredAccount.identifier,
      pds: discoveredAccount.pdsUrl,
      loginService,
      error: error?.error || error?.message,
    });

    if (error instanceof AuthError) throw error;
    if (isAuthFactorRequired(error)) throw new AuthFactorRequiredError();

    const message = String(error?.message || "");
    if (/invalid.*(password|identifier)|authentication required/i.test(message)) {
      throw new AuthError("Identifiant ou mot de passe incorrect.");
    }

    throw new AuthError(
      `Connexion AT Protocol impossible${message ? `: ${message}` : "."}`
    );
  }

  if (!agent.session) {
    throw new AuthError(
      "La connexion a échoué : aucune session n’a été retournée par le PDS."
    );
  }
  if (agent.session.did !== discoveredAccount.did) {
    throw new AuthError(
      "La session retournée ne correspond pas à l’identité AT Protocol demandée."
    );
  }

  const session: AtpSession = {
    accessJwt: agent.session.accessJwt,
    refreshJwt: agent.session.refreshJwt,
    handle: agent.session.handle,
    did: agent.session.did,
    pdsUrl: discoveredAccount.pdsUrl,
  };

  sessionStorage.set(session);
  cachedAgent = agent;
  cachedSessionKey = getSessionKey(session);
  return session;
}

export async function loginWithKeloIdSession(session: AtpSession): Promise<AtpSession> {
  if (
    !session?.accessJwt ||
    !session?.refreshJwt ||
    !session?.handle ||
    !session?.did ||
    !session?.pdsUrl
  ) {
    throw new AuthError("Session Kelo ID incomplète.");
  }

  saveSession(session);
  try {
    await resumeAgentSession(session);
    const current = getStoredSession();
    if (!current) throw new AuthError("La session Kelo ID n’a pas pu être enregistrée.");
    if (current.did !== session.did) {
      throw new AuthError("La session Kelo ID ne correspond pas au compte confirmé.");
    }
    return current;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(
      "La session transmise par Kelo ID ne peut pas être validée. Scannez un nouveau QR."
    );
  }
}

export function logout() {
  clearCachedAgent();
  sessionStorage.clear();
}

export function getStoredSession() {
  return sessionStorage.get();
}

export async function resumeAgentSession(session: AtpSession) {
  const key = getSessionKey(session);
  if (cachedAgent && cachedSessionKey === key) return cachedAgent;

  const resume = async (active: AtpSession) => {
    const agent = createAtpAgent(getLoginServiceForPds(active.pdsUrl));
    await withTimeout(
      agent.resumeSession({
        accessJwt: active.accessJwt,
        refreshJwt: active.refreshJwt,
        active: true,
        handle: active.handle,
        did: active.did,
      }),
      SESSION_TIMEOUT_MS,
      "La reprise de session prend trop de temps."
    );
    await withTimeout(
      agent.api.com.atproto.server.getSession(),
      SESSION_TIMEOUT_MS,
      "Le PDS ne confirme pas la session assez rapidement."
    );
    cachedAgent = agent;
    cachedSessionKey = getSessionKey(active);
    return agent;
  };

  try {
    return await resume(session);
  } catch {
    try {
      return await resume(await refreshAtProtocolSession(session));
    } catch (error) {
      clearCachedAgent();
      if (error instanceof AuthError) {
        sessionStorage.clear();
        throw error;
      }
      throw new AuthError(
        "Connexion temporairement impossible avec votre PDS. Votre session est conservée."
      );
    }
  }
}

export async function restoreStoredSession() {
  const stored = getStoredSession();
  if (!stored) return null;
  try {
    await resumeAgentSession(stored);
    return getStoredSession() || stored;
  } catch {
    return getStoredSession();
  }
}

export async function getAuthenticatedAgent() {
  const session = getStoredSession();
  if (!session) throw new AuthError("Vous devez être connecté.");
  const agent = await resumeAgentSession(session);
  return { agent, session: getStoredSession() || session };
}

export async function signup(payload: SignupPayload): Promise<void> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data: { error?: string };
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new AuthError(data.error || "Erreur lors de l'inscription.");
  }
}
