import { getStoredSession, resumeAgentSession } from "@/services/auth.service";

/**
 * Suit un compte. Retourne l'URI de l'enregistrement "follow" créé — à
 * conserver pour pouvoir le supprimer plus tard (se désabonner).
 */
export async function followActor(did: string): Promise<string> {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté.");
  const agent = await resumeAgentSession(session);
  const res = await agent.api.app.bsky.graph.follow.create(
    { repo: session.did },
    { subject: did, createdAt: new Date().toISOString() }
  );
  return res.uri;
}

export async function unfollowActor(followUri: string): Promise<void> {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté.");
  const agent = await resumeAgentSession(session);
  const rkey = followUri.split("/").pop();
  if (!rkey) throw new Error("URI de suivi invalide.");
  await agent.api.app.bsky.graph.follow.delete({ repo: session.did, rkey });
}
