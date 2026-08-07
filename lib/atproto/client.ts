import { AtpAgent } from "@atproto/api";
import { sessionStorage } from "@/lib/session/session-storage";

/**
 * Point d'entrée unique pour créer un agent AT Protocol.
 *
 * AT Protocol peut faire tourner accessJwt/refreshJwt automatiquement.
 * Le callback persistSession est donc indispensable : sans lui, le
 * navigateur conserverait un ancien refreshJwt qui a déjà été révoqué.
 */
export function createAtpAgent(pdsUrl: string): AtpAgent {
  const normalizedPds = pdsUrl.trim().replace(/\/$/, "");

  return new AtpAgent({
    service: normalizedPds,
    persistSession: (_event, session) => {
      if (
        typeof window === "undefined" ||
        !session?.accessJwt ||
        !session?.refreshJwt ||
        !session?.handle ||
        !session?.did
      ) {
        return;
      }

      sessionStorage.set({
        accessJwt: session.accessJwt,
        refreshJwt: session.refreshJwt,
        handle: session.handle,
        did: session.did,
        pdsUrl: normalizedPds,
      });
    },
  });
}
