import { getReadAgent } from "@/lib/atproto/read-agent";

export interface GetPostThreadOptions {
  /**
   * Nombre de niveaux de réponses à récupérer.
   *
   * Une valeur raisonnable évite de charger un arbre de discussion
   * extrêmement volumineux en une seule requête.
   */
  depth?: number;

  /**
   * Nombre de publications parentes à récupérer lorsque l’URI correspond
   * à une réponse située au milieu d’une conversation.
   */
  parentHeight?: number;
}

/**
 * Récupère une publication, ses réponses imbriquées et ses éventuels
 * parents depuis l’AppView AT Protocol.
 *
 * Lorsqu’une URI correspond à une réponse, on affiche désormais directement
 * son parent immédiat. Cela permet notamment qu’un clic sur une réponse
 * depuis l’onglet « Réponses » d’un profil ouvre la publication à laquelle
 * cette réponse répond, comme sur Bluesky et X/Twitter.
 */
export async function getPostThread(
  uri: string,
  {
    depth = 6,
    parentHeight = 20,
  }: GetPostThreadOptions = {}
) {
  if (!uri.trim()) {
    throw new Error("URI de publication manquante.");
  }

  const agent = await getReadAgent();

  const response =
    await agent.api.app.bsky.feed.getPostThread({
      uri,
      depth,
      parentHeight,
    });

  const thread: any = response.data.thread;

  // Pour une réponse, AT Protocol fournit son parent dans `parent`.
  // Retourner ce parent fait ouvrir la conversation sur le post auquel
  // l’utilisateur répondait, plutôt que sur la réponse elle-même.
  if (thread?.parent?.post?.uri) {
    return thread.parent;
  }

  return thread;
}
