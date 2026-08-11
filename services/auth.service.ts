import { createAtpAgent } from "@/lib/atproto/client";
import {
  AtprotoDiscoveryError,
  discoverAccount,
} from "@/lib/atproto/discovery";
import { sessionStorage } from "@/lib/session/session-storage";
import {
  AtpSession,
  LoginCredentials,
  SignupPayload,
} from "@/types/auth";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

let cachedAgent: ReturnType<typeof createAtpAgent> | null = null;
let cachedSessionKey: string | null = null;
let pendingSessionRefresh: Promise<AtpSession> | null = null;

const BLUESKY_ENTRYWAY_URL = "https://bsky.social";

function getSessionKey(session: AtpSession): string {
  return [
    session.did,
    session.pdsUrl,
    session.accessJwt,
    session.refreshJwt,
  ].join("|");
}

function clearCachedAgent(): void {
  cachedAgent = null;
  cachedSessionKey = null;
}

function saveSession(session: AtpSession): void {
  sessionStorage.set(session);
  clearCachedAgent();
}

function normalizePdsUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

/**
 * Bluesky héberge ses comptes sur de nombreux PDS du type
 * <nom>.<region>.host.bsky.network, mais la création de session est
 * orchestrée par l'Entryway bsky.social. Le SDK AT Protocol se charge
 * ensuite de router l'agent vers le véritable PDS de l'utilisateur.
 *
 * Tous les autres PDS AT Protocol sont contactés directement.
 */
function getLoginServiceForPds(pdsUrl: string): string {
  try {
    const hostname = new URL(pdsUrl).hostname.toLowerCase();

    if (
      hostname === "bsky.social" ||
      hostname.endsWith(".host.bsky.network")
    ) {
      return BLUESKY_ENTRYWAY_URL;
    }
  } catch {
    // L'URL a déjà été validée par la découverte AT Protocol.
  }

  return normalizePdsUrl(pdsUrl);
}

function isDefinitelyExpiredSessionStatus(status: number): boolean {
  return status === 400 || status === 401 || status === 403;
}

async function refreshAtProtocolSession(
  session: AtpSession
): Promise<AtpSession> {
  if (pendingSessionRefresh) {
    return pendingSessionRefresh;
  }

  pendingSessionRefresh = (async () => {
    if (!session.refreshJwt) {
      throw new AuthError(
        "Votre session ne peut pas être renouvelée. Veuillez vous reconnecter."
      );
    }

    let response: Response;

    try {
      response = await fetch(
        `${normalizePdsUrl(session.pdsUrl)}/xrpc/com.atproto.server.refreshSession`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.refreshJwt}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );
    } catch (error) {
      console.warn("PDS temporarily unreachable while refreshing session:", error);
      throw error;
    }

    if (!response.ok) {
      if (isDefinitelyExpiredSessionStatus(response.status)) {
        throw new AuthError(
          "Votre session a expiré. Veuillez vous reconnecter."
        );
      }

      throw new Error(
        `Le PDS est temporairement indisponible pendant le renouvellement de session (${response.status}).`
      );
    }

    const data = (await response.json()) as Partial<AtpSession> & {
      accessJwt?: string;
      refreshJwt?: string;
      handle?: string;
      did?: string;
    };

    if (
      !data.accessJwt ||
      !data.refreshJwt ||
      !data.handle ||
      !data.did
    ) {
      throw new AuthError(
        "Le PDS a retourné une session incomplète."
      );
    }

    if (data.did !== session.did) {
      throw new AuthError(
        "La session renouvelée ne correspond pas au compte connecté."
      );
    }

    const refreshedSession: AtpSession = {
      accessJwt: data.accessJwt,
      refreshJwt: data.refreshJwt,
      handle: data.handle,
      did: data.did,
      pdsUrl: session.pdsUrl,
    };

    saveSession(refreshedSession);
    return refreshedSession;
  })();

  try {
    return await pendingSessionRefresh;
  } finally {
    pendingSessionRefresh = null;
  }
}

/**
 * Authentifie automatiquement un utilisateur auprès de son infrastructure
 * AT Protocol, quel que soit son PDS.
 *
 * - PDS indépendants : connexion directe au serviceEndpoint du DID.
 * - PDS Bluesky *.host.bsky.network : création de session via bsky.social,
 *   puis routage dynamique du SDK vers le PDS réel.
 */
export async function login(
  credentials: LoginCredentials
): Promise<AtpSession> {
  const identifier = credentials.identifier
    .trim()
    .replace(/^@/, "")
    .toLowerCase();

  if (!identifier) {
    throw new AuthError(
      "Veuillez saisir votre identifiant AT Protocol."
    );
  }

  if (!credentials.password) {
    throw new AuthError(
      "Veuillez saisir votre mot de passe."
    );
  }

  let discoveredAccount;

  try {
    discoveredAccount = await discoverAccount(identifier);
  } catch (error) {
    if (error instanceof AtprotoDiscoveryError) {
      throw new AuthError(error.message);
    }

    throw new AuthError(
      "Impossible de trouver le serveur PDS associé à ce compte."
    );
  }

  const loginService = getLoginServiceForPds(
    discoveredAccount.pdsUrl
  );
  const agent = createAtpAgent(loginService);

  try {
    await agent.login({
      identifier: discoveredAccount.identifier,
      password: credentials.password,
    });
  } catch (error) {
    console.error(
      "AT Protocol login error:",
      { identifier: discoveredAccount.identifier, pds: discoveredAccount.pdsUrl, loginService },
      error
    );

    throw new AuthError(
      "Échec de la connexion. Vérifiez votre identifiant et votre mot de passe."
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
    // Toujours conserver le PDS réel issu du document DID, jamais l'Entryway.
    pdsUrl: discoveredAccount.pdsUrl,
  };

  sessionStorage.set(session);

  cachedAgent = agent;
  cachedSessionKey = getSessionKey(session);

  return session;
}

/**
 * Enregistre une session AT Protocol déjà authentifiée par Kelo ID.
 * Elle est vérifiée puis renouvelée automatiquement si nécessaire.
 */
export async function loginWithKeloIdSession(
  session: AtpSession
): Promise<AtpSession> {
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

    const currentSession = getStoredSession();

    if (!currentSession) {
      throw new AuthError(
        "La session Kelo ID n’a pas pu être enregistrée."
      );
    }

    if (currentSession.did !== session.did) {
      throw new AuthError(
        "La session Kelo ID ne correspond pas au compte confirmé."
      );
    }

    return currentSession;
  } catch (error) {
    console.error("Kelo ID session validation error:", error);

    if (error instanceof AuthError) {
      throw error;
    }

    throw new AuthError(
      "La session transmise par Kelo ID ne peut pas être validée. Scannez un nouveau QR."
    );
  }
}

export function logout(): void {
  clearCachedAgent();
  sessionStorage.clear();
}

export function getStoredSession(): AtpSession | null {
  return sessionStorage.get();
}

export async function resumeAgentSession(
  session: AtpSession
) {
  const sessionKey = getSessionKey(session);

  if (
    cachedAgent &&
    cachedSessionKey === sessionKey
  ) {
    return cachedAgent;
  }

  const resume = async (activeSession: AtpSession) => {
    const agent = createAtpAgent(activeSession.pdsUrl);

    await agent.resumeSession({
      accessJwt: activeSession.accessJwt,
      refreshJwt: activeSession.refreshJwt,
      active: true,
      handle: activeSession.handle,
      did: activeSession.did,
    });

    await agent.api.com.atproto.server.getSession();

    cachedAgent = agent;
    cachedSessionKey = getSessionKey(activeSession);

    return agent;
  };

  try {
    return await resume(session);
  } catch (firstError) {
    console.info(
      "AT Protocol access token unavailable, attempting session refresh.",
      firstError
    );

    try {
      const refreshedSession =
        await refreshAtProtocolSession(session);

      return await resume(refreshedSession);
    } catch (refreshError) {
      console.error(
        "AT Protocol session refresh error:",
        refreshError
      );

      clearCachedAgent();

      if (refreshError instanceof AuthError) {
        sessionStorage.clear();
        throw refreshError;
      }

      throw new AuthError(
        "Connexion temporairement impossible avec votre PDS. Votre session est conservée."
      );
    }
  }
}

export async function restoreStoredSession(): Promise<AtpSession | null> {
  const stored = getStoredSession();

  if (!stored) {
    return null;
  }

  try {
    await resumeAgentSession(stored);
    return getStoredSession() || stored;
  } catch {
    return getStoredSession();
  }
}

export async function getAuthenticatedAgent() {
  const session = getStoredSession();

  if (!session) {
    throw new AuthError(
      "Vous devez être connecté."
    );
  }

  const agent = await resumeAgentSession(session);
  const currentSession = getStoredSession() || session;

  return {
    agent,
    session: currentSession,
  };
}

export async function signup(
  payload: SignupPayload
): Promise<void> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: { error?: string };

  try {
    data = (await response.json()) as {
      error?: string;
    };
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new AuthError(
      data.error ||
        "Erreur lors de l'inscription."
    );
  }
}
