import { createAppViewAgent } from "@/lib/atproto/appview";
import { getStoredSession, resumeAgentSession } from "@/services/auth.service";

/**
 * Agent de lecture partagé par toute l'app (recherche, profils, fils).
 *
 * S'il existe une session valide, on l'utilise : les requêtes passent alors
 * par le PDS de l'utilisateur (proxyées vers l'AppView), ce qui évite les
 * limitations/erreurs de l'AppView public en anonyme sur certains endpoints
 * (recherche notamment).
 *
 * Sans session (ou si elle a expiré), on retombe sur l'AppView public en
 * lecture seule — jamais d'échec bloquant pour l'utilisateur.
 */
export async function getReadAgent() {
  const session = getStoredSession();
  if (session) {
    try {
      return await resumeAgentSession(session);
    } catch {
      // Session invalide/expirée : on retombe sur l'AppView public.
    }
  }
  return createAppViewAgent();
}
