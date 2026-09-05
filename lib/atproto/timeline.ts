import { getReadAgent } from "@/lib/atproto/read-agent";
import { getDiscoverFeed } from "@/lib/atproto/feed";

function onlyRootPosts(items: any[]) {
  return items.filter((item: any) => !item?.post?.record?.reply);
}

/**
 * Timeline personnelle (comptes suivis). Comme la lecture passe par le PDS
 * de l'utilisateur (proxyé vers un AppView fédéré), les publications
 * apparaissent quel que soit le PDS d'origine du compte suivi.
 *
 * Les réponses/commentaires restent rattachés à leur publication et ne sont
 * pas affichés comme des publications autonomes dans le feed principal.
 */
export async function getFollowingTimeline(limit = 25, cursor?: string) {
  try {
    const agent = await getReadAgent();
    const res = await agent.api.app.bsky.feed.getTimeline({ limit, cursor });
    return { items: onlyRootPosts(res.data.feed), cursor: res.data.cursor };
  } catch (error) {
    console.warn(
      "Timeline personnelle indisponible, bascule vers le fil public fédéré :",
      error
    );
    return getDiscoverFeed(limit, cursor);
  }
}
