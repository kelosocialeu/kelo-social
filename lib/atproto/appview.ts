import { AtpAgent } from "@atproto/api";

export const PUBLIC_APPVIEW_URL =
  "https://public.api.bsky.app";

let sharedAppViewAgent:
  | AtpAgent
  | null = null;

/**
 * Retourne un agent AppView public partagé.
 *
 * Réutiliser l’agent évite de recréer inutilement le client HTTP pour
 * chaque recherche, profil ou fil public.
 */
export function createAppViewAgent(): AtpAgent {
  if (!sharedAppViewAgent) {
    sharedAppViewAgent = new AtpAgent({
      service: PUBLIC_APPVIEW_URL,
    });
  }

  return sharedAppViewAgent;
}

export function clearAppViewAgentCache(): void {
  sharedAppViewAgent = null;
}
