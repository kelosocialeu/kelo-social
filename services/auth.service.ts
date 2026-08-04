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

/**
 * Authentifie automatiquement un utilisateur auprès de son propre PDS.
 *
 * L'utilisateur ne doit plus sélectionner son PDS :
 * 1. son handle est résolu en DID ;
 * 2. le document DID est récupéré ;
 * 3. l'adresse du PDS est découverte ;
 * 4. la connexion est envoyée au bon PDS.
 */
export async function login(
  credentials: LoginCredentials
): Promise<AtpSession> {
  const identifier = credentials.identifier
    .trim()
    .replace(/^@/, "")
    .toLowerCase();

  if (!identifier) {
    throw new AuthError("Veuillez saisir votre identifiant AT Protocol.");
  }

  if (!credentials.password) {
    throw new AuthError("Veuillez saisir votre mot de passe.");
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

  const agent = createAtpAgent(discoveredAccount.pdsUrl);

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

  return session;
}

/**
 * Déconnecte l'utilisateur et efface la session locale.
 */
export function logout(): void {
  sessionStorage.clear();
}

/**
 * Récupère la session actuellement stockée.
 */
export function getStoredSession(): AtpSession | null {
  return sessionStorage.get();
}

/**
 * Reconstruit un agent authentifié à partir d'une session enregistrée.
 */
export async function resumeAgentSession(session: AtpSession) {
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
    console.error("AT Protocol session resume error:", error);
    sessionStorage.clear();

    throw new AuthError(
      "Votre session a expiré. Veuillez vous reconnecter."
    );
  }

  return agent;
}

/**
 * Inscrit un nouvel utilisateur au moyen de l'API interne de Kelo Social.
 */
export async function signup(payload: SignupPayload): Promise<void> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let data: { error?: string };

  try {
    data = (await response.json()) as { error?: string };
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new AuthError(
      data.error || "Erreur lors de l'inscription."
    );
  }
}
