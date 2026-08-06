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

/**
 * Authentifie automatiquement un utilisateur auprès de son propre PDS.
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

  const agent = createAtpAgent(
    discoveredAccount.pdsUrl
  );

  try {
    await agent.login({
      identifier: discoveredAccount.identifier,
      password: credentials.password,
    });
  } catch (error) {
    console.error("AT Protocol login error:", error);

    throw new AuthError(
      "Échec de la connexion. Vérifiez votre identifiant et votre mot de passe."
    );
  }

  if (!agent.session) {
    throw new AuthError(
      "La connexion a échoué : aucune session n’a été retournée par le PDS."
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

/**
 * Enregistre une session AT Protocol déjà authentifiée par Kelo ID.
 * La session est validée auprès de son PDS avant d’être conservée.
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

  const agent = createAtpAgent(session.pdsUrl);

  try {
    await agent.resumeSession({
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      active: true,
      handle: session.handle,
      did: session.did,
    });

    const response =
      await agent.api.com.atproto.server.getSession();

    if (response.data.did !== session.did) {
      throw new Error("Le DID de la session ne correspond pas.");
    }
  } catch (error) {
    console.error("Kelo ID session validation error:", error);
    throw new AuthError(
      "La session transmise par Kelo ID n’est plus valide. Reconnectez-vous à Kelo ID."
    );
  }

  saveSession(session);
  cachedAgent = agent;
  cachedSessionKey = getSessionKey(session);

  return session;
}

/**
 * Déconnecte l'utilisateur et efface la session locale.
 */
export function logout(): void {
  clearCachedAgent();
  sessionStorage.clear();
}

/**
 * Récupère la session actuellement stockée.
 */
export function getStoredSession(): AtpSession | null {
  return sessionStorage.get();
}

/**
 * Retourne un agent authentifié réutilisable.
 *
 * L’agent n’est reconstruit qu’en cas de changement de session,
 * de PDS ou de jeton. Cela évite de recréer un agent à chaque like,
 * repost, réponse ou changement de page.
 */
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

  const agent = createAtpAgent(session.pdsUrl);

  try {
    await agent.resumeSession({
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      active: true,
      handle: session.handle,
      did: session.did,
    });
  } catch (error) {
    console.error(
      "AT Protocol session resume error:",
      error
    );

    clearCachedAgent();
    sessionStorage.clear();

    throw new AuthError(
      "Votre session a expiré. Veuillez vous reconnecter."
    );
  }

  cachedAgent = agent;
  cachedSessionKey = sessionKey;

  return agent;
}

/**
 * Retourne directement la session et l’agent authentifié.
 */
export async function getAuthenticatedAgent() {
  const session = getStoredSession();

  if (!session) {
    throw new AuthError(
      "Vous devez être connecté."
    );
  }

  const agent = await resumeAgentSession(session);

  return {
    agent,
    session,
  };
}

/**
 * Inscrit un nouvel utilisateur au moyen de l'API interne de Kelo Social.
 */
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
