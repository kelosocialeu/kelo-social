import { getReadAgent } from "@/lib/atproto/read-agent";

/**
 * Timeline personnelle (comptes suivis). Comme la lecture passe par le PDS
 * de l'utilisateur (proxyé vers un AppView fédéré), les publications
 * apparaissent quel que soit le PDS d'origine du compte suivi.
 */
export async function getFollowingTimeline(limit = 25, cursor?: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.feed.getTimeline({ limit, cursor });
  return { items: res.data.feed, cursor: res.data.cursor };
}
