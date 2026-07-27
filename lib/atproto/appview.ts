import { AtpAgent } from "@atproto/api";

/**
 * Agent de LECTURE connecté à l'AppView public du réseau AT Protocol.
 *
 * Contrairement au PDS (qui héberge uniquement les comptes d'une instance
 * donnée, ex. pds.kelosocial.eu), l'AppView indexe l'ensemble du réseau
 * fédéré — Bluesky, WSocial, Eurosky, Kelo Social, etc. — via le relay.
 * C'est cet agent qu'on utilise pour LIRE un fil découverte, un profil ou
 * une recherche, afin que les publications de tous les PDS apparaissent,
 * exactement comme sur mu.social.
 *
 * L'écriture (publier, liker, reposter, suivre) reste effectuée via l'agent
 * authentifié sur le PDS de l'utilisateur (services/auth.service.ts), car
 * seul le PDS d'origine du compte peut signer ses actions.
 */
export const PUBLIC_APPVIEW_URL = "https://public.api.bsky.app";

export function createAppViewAgent(): AtpAgent {
  return new AtpAgent({ service: PUBLIC_APPVIEW_URL });
}
