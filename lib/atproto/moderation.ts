import { getStoredSession, resumeAgentSession } from "@/services/auth.service";

async function getModAgent() {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté.");
  const agent = await resumeAgentSession(session);
  return { agent, myDid: session.did };
}

export async function blockActor(did: string): Promise<void> {
  const { agent, myDid } = await getModAgent();
  await agent.api.app.bsky.graph.block.create({ repo: myDid }, { subject: did, createdAt: new Date().toISOString() });
}

export async function muteActor(did: string): Promise<void> {
  const { agent } = await getModAgent();
  await agent.api.app.bsky.graph.muteActor({ actor: did }, { encoding: "application/json" });
}

export type ReportReason =
  | "com.atproto.moderation.defs#reasonSpam"
  | "com.atproto.moderation.defs#reasonViolation"
  | "com.atproto.moderation.defs#reasonMisleading"
  | "com.atproto.moderation.defs#reasonSexual"
  | "com.atproto.moderation.defs#reasonRude"
  | "com.atproto.moderation.defs#reasonOther";

export async function reportPost(uri: string, cid: string, reasonType: ReportReason): Promise<void> {
  const { agent } = await getModAgent();
  await agent.api.com.atproto.moderation.createReport(
    { reasonType, subject: { $type: "com.atproto.repo.strongRef", uri, cid } },
    { encoding: "application/json" }
  );
}

export async function reportAccount(did: string, reasonType: ReportReason): Promise<void> {
  const { agent } = await getModAgent();
  await agent.api.com.atproto.moderation.createReport(
    { reasonType, subject: { $type: "com.atproto.admin.defs#repoRef", did } },
    { encoding: "application/json" }
  );
}
