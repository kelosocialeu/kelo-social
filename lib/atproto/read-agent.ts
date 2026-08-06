import { AtpAgent } from "@atproto/api";

import {
  createAppViewAgent,
} from "@/lib/atproto/appview";

import {
  getStoredSession,
  resumeAgentSession,
} from "@/services/auth.service";

let cachedAgent: AtpAgent | null = null;
let cachedSessionDid = "";
let pendingAgent:
  | Promise<AtpAgent>
  | null = null;

export function clearReadAgentCache(): void {
  cachedAgent = null;
  cachedSessionDid = "";
  pendingAgent = null;
}

/**
 * Réutilise le même agent de lecture tant que la session ne change pas.
 * Cela évite de restaurer la session auprès du PDS à chaque requête de
 * profil, fil, recherche, notification ou conversation.
 */
export async function getReadAgent(): Promise<AtpAgent> {
  const session = getStoredSession();

  if (!session) {
    if (
      cachedAgent &&
      cachedSessionDid === "public"
    ) {
      return cachedAgent;
    }

    const publicAgent =
      createAppViewAgent();

    cachedAgent = publicAgent;
    cachedSessionDid = "public";

    return publicAgent;
  }

  if (
    cachedAgent &&
    cachedSessionDid === session.did
  ) {
    return cachedAgent;
  }

  if (pendingAgent) {
    return pendingAgent;
  }

  pendingAgent = resumeAgentSession(session)
    .then((agent) => {
      cachedAgent = agent;
      cachedSessionDid = session.did;
      return agent;
    })
    .catch((error) => {
      console.warn(
        "Session de lecture invalide, utilisation de l’AppView publique :",
        error
      );

      const publicAgent =
        createAppViewAgent();

      cachedAgent = publicAgent;
      cachedSessionDid = "public";

      return publicAgent;
    })
    .finally(() => {
      pendingAgent = null;
    });

  return pendingAgent;
}
