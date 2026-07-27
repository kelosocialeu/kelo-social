import { createAppViewAgent } from "@/lib/atproto/appview";

/**
 * Feed generator public "What's Hot" : agrège les publications populaires
 * de tout le réseau fédéré (Bluesky, WSocial, Eurosky, Kelo Social...).
 * C'est ce type de flux qui alimente l'onglet "Discover" de mu.social.
 *
 * On pourra plus tard remplacer cette URI par un feed generator propre à
 * Kelo Social une fois qu'un algorithme dédié sera déployé.
 */
const DISCOVER_FEED_URI =
  "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";

export async function getDiscoverFeed(limit = 40) {
  const agent = createAppViewAgent();
  const res = await agent.api.app.bsky.feed.getFeed({ feed: DISCOVER_FEED_URI, limit });
  return res.data.feed;
}
