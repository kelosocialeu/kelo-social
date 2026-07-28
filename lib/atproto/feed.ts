import { createAppViewAgent } from "@/lib/atproto/appview";

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
