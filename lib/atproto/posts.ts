import { RichText } from "@atproto/api";
import { getStoredSession, resumeAgentSession } from "@/services/auth.service";

/**
 * Publie un nouveau post. Utilise RichText.detectFacets() d'@atproto/api
 * pour détecter et résoudre automatiquement les mentions (@handle -> DID)
 * et les liens dans le texte saisi, afin qu'ils s'affichent comme du
 * texte cliquable pour tout le monde sur le réseau, pas seulement dans
 * cette app.
 */
export async function createPost(text: string) {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté pour publier.");

  const agent = await resumeAgentSession(session);

  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  const res = await agent.api.app.bsky.feed.post.create(
    { repo: session.did },
    { text: rt.text, facets: rt.facets, createdAt: new Date().toISOString() }
  );

  return { uri: res.uri, cid: res.cid, text: rt.text, facets: rt.facets };
}

/**
 * Supprime une publication qui vous appartient, directement sur votre PDS.
 */
export async function deleteOwnPost(uri: string): Promise<void> {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté.");

  const agent = await resumeAgentSession(session);
  const rkey = uri.split("/").pop();
  if (!rkey) throw new Error("URI de publication invalide.");

  await agent.api.app.bsky.feed.post.delete({ repo: session.did, rkey });
}
