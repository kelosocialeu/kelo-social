import {
  getStoredSession,
  resumeAgentSession,
} from "@/services/auth.service";
import {
  requireIdentityVerification,
} from "@/lib/atproto/verification-guard";

export async function followActor(
  did: string
): Promise<string> {
  await requireIdentityVerification();

  const session = getStoredSession();

  if (!session) {
    throw new Error("Vous devez être connecté.");
  }

  const agent = await resumeAgentSession(session);
  const response =
    await agent.api.app.bsky.graph.follow.create(
      { repo: session.did },
      {
        subject: did,
        createdAt: new Date().toISOString(),
      }
    );

  return response.uri;
}

export async function unfollowActor(
  followUri: string
): Promise<void> {
  await requireIdentityVerification();

  const session = getStoredSession();

  if (!session) {
    throw new Error("Vous devez être connecté.");
  }

  const agent = await resumeAgentSession(session);
  const rkey = followUri.split("/").pop();

  if (!rkey) {
    throw new Error("URI de suivi invalide.");
  }

  await agent.api.app.bsky.graph.follow.delete({
    repo: session.did,
    rkey,
  });
}
