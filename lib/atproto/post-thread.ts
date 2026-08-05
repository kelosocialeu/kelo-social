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
 * Contrairement aux fils classiques, getPostThread ne fournit pas de
 * curseur de pagination. La quantité chargée est contrôlée avec depth
 * et parentHeight.
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

  return response.data.thread;
}
