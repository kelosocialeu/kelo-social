import { AtpAgent } from "@atproto/api";

/**
 * Point d'entrée unique pour créer un agent AT Protocol.
 * Toute évolution future (proxy, headers custom, retry, logging)
 * se fait ici, sans toucher aux pages ou services appelants.
 */
export function createAtpAgent(pdsUrl: string): AtpAgent {
  return new AtpAgent({ service: pdsUrl });
}
