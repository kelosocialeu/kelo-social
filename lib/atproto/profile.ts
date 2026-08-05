import { getReadAgent } from "@/lib/atproto/read-agent";

/**
 * Récupère le profil avec la session authentifiée lorsqu’elle existe.
 *
 * C’est indispensable pour recevoir les états personnels :
 * - viewer.following ;
 * - viewer.followedBy ;
 * - viewer.blocking ;
 * - viewer.muted ;
 * - autres informations liées au compte connecté.
 */
export async function getActorProfile(actor: string) {
  const agent = await getReadAgent();

  const response =
    await agent.api.app.bsky.actor.getProfile({
      actor,
    });

  return response.data;
}

/**
 * Récupère une page du fil d’un compte avec les états personnels
 * du compte connecté : likes, republications, masquages, etc.
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
