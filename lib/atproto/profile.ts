import { createAppViewAgent } from "@/lib/atproto/appview";
import { getReadAgent } from "@/lib/atproto/read-agent";

/**
 * Récupère un profil directement depuis l’AppView publique Bluesky.
 *
 * Cela garantit que les informations enrichies du profil, notamment
 * les certifications et certificateurs de confiance natifs, sont
 * récupérées depuis la même AppView de référence pour tous les PDS.
 */
export async function getActorProfile(actor: string) {
  const appViewAgent = createAppViewAgent();

  const response =
    await appViewAgent.api.app.bsky.actor.getProfile({
      actor,
    });

  return response.data;
}

/**
 * Récupère une page du fil d’un compte.
 *
 * On conserve l’agent de lecture authentifié lorsque disponible afin
 * de garder les états propres à l’utilisateur connecté :
 * likes, reposts, abonnements, masquages, etc.
 *
 * Le curseur permet de charger progressivement toutes les publications
 * du profil avec le scroll infini.
 */
export async function getActorFeed(
  actor: string,
  limit = 30,
  cursor?: string
) {
  const agent = await getReadAgent();

  const response =
    await agent.api.app.bsky.feed.getAuthorFeed({
      actor,
      limit,
      cursor,
    });

  return {
    items: response.data.feed,
    cursor: response.data.cursor,
  };
}
