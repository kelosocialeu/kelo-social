import { getStoredSession, resumeAgentSession } from "@/services/auth.service";

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
