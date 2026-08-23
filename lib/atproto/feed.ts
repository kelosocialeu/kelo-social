import { createAppViewAgent } from "@/lib/atproto/appview";
import { getReadAgent } from "@/lib/atproto/read-agent";

/**
 * Feed generator public "What's Hot" : agrège les publications populaires
 * de tout le réseau fédéré (Bluesky, WSocial, Eurosky, Kelo Social...).
 */
const DISCOVER_FEED_URI =
  "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";

export async function getDiscoverFeed(limit = 25, cursor?: string) {
  const agent = createAppViewAgent();
  const res = await agent.api.app.bsky.feed.getFeed({ feed: DISCOVER_FEED_URI, limit, cursor });
  return { items: res.data.feed, cursor: res.data.cursor };
}

/**
 * Timeline authentifiée de l'utilisateur : elle contient les publications des
 * comptes suivis. Les Réels filtrent ensuite cette timeline pour ne conserver
 * que les publications vidéo.
 */
export async function getFollowingFeed(limit = 50, cursor?: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.feed.getTimeline({ limit, cursor });
  return { items: res.data.feed, cursor: res.data.cursor };
}
