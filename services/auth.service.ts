import { createAtpAgent } from "@/lib/atproto/client";
import { sessionStorage } from "@/lib/session/session-storage";
import { normalizePdsUrl } from "@/lib/atproto/pds";
import { AtpSession, LoginCredentials, SignupPayload } from "@/types/auth";

export class AuthError extends Error {}

/**
 * Authentifie un utilisateur auprès d'un PDS AT Protocol et persiste la session.
 */
export async function login(credentials: LoginCredentials): Promise<AtpSession> {
  const pdsUrl = normalizePdsUrl(credentials.pdsUrl);
  const agent = createAtpAgent(pdsUrl);

  try {
    await agent.login({
      identifier: credentials.identifier.trim(),
      password: credentials.password,
    });
  } catch {
    throw new AuthError("Échec de la connexion. Vérifiez vos identifiants ou le PDS sélectionné.");
  }

  if (!agent.session) {
    throw new AuthError("La connexion a échoué : aucune session retournée par le PDS.");
  }

  const session: AtpSession = {
    accessJwt: agent.session.accessJwt,
    refreshJwt: agent.session.refreshJwt,
    handle: agent.session.handle,
    did: agent.session.did,
    pdsUrl,
  };

  sessionStorage.set(session);
  return session;
}

export function logout(): void {
  sessionStorage.clear();
}

export function getStoredSession(): AtpSession | null {
  return sessionStorage.get();
}

/**
 * Reconstruit un agent authentifié à partir d'une session stockée.
 * Sera utilisé par Feed, Profil, Messages, etc.
 */
export async function resumeAgentSession(session: AtpSession) {
  const agent = createAtpAgent(session.pdsUrl);
  await agent.resumeSession({
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt,
    active: true,
    handle: session.handle,
    did: session.did,
  });
  return agent;
}

export async function signup(payload: SignupPayload): Promise<void> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AuthError(data.error || "Erreur lors de l'inscription.");
  }
}
