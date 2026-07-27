import { getReadAgent } from "@/lib/atproto/read-agent";

export async function getActorProfile(actor: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.actor.getProfile({ actor });
  return res.data;
}

export async function getActorFeed(actor: string, limit = 30) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.feed.getAuthorFeed({ actor, limit });
  return res.data.feed;
}
