import { getReadAgent } from "@/lib/atproto/read-agent";
import { getDiscoverFeed } from "@/lib/atproto/feed";

/**
 * Timeline personnelle (comptes suivis). Comme la lecture passe par le PDS
 * de l'utilisateur (proxyé vers un AppView fédéré), les publications
 * apparaissent quel que soit le PDS d'origine du compte suivi.
 *
 * Si le PDS de l'utilisateur est temporairement indisponible, on bascule
 * automatiquement sur le fil public fédéré afin que Kelo Social reste
 * utilisable au lieu d'afficher une erreur globale.
 */
export async function getFollowingTimeline(limit = 25, cursor?: string) {
  try {
    const agent = await getReadAgent();
    const res = await agent.api.app.bsky.feed.getTimeline({ limit, cursor });
    return { items: res.data.feed, cursor: res.data.cursor };
  } catch (error) {
    console.warn(
      "Timeline personnelle indisponible, bascule vers le fil public fédéré :",
      error
    );
    return getDiscoverFeed(limit, cursor);
  }
}
