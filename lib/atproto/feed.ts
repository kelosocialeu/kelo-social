import { createAppViewAgent } from "@/lib/atproto/appview";
import { getReadAgent } from "@/lib/atproto/read-agent";

function onlyRootPosts(items: any[]) {
  return items.filter((item: any) => !item?.post?.record?.reply);
}

const DISCOVER_FEED_URI =
  "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";

export const KELO_ALGORITHM_FEED_URIS = {
  "very-low": "at://did:web:feeds.kelosocial.eu/app.bsky.feed.generator/kelo-very-low",
  medium: "at://did:web:feeds.kelosocial.eu/app.bsky.feed.generator/kelo-medium",
  "medium-addictive": "at://did:web:feeds.kelosocial.eu/app.bsky.feed.generator/kelo-medium-addictive",
  addictive: "at://did:web:feeds.kelosocial.eu/app.bsky.feed.generator/kelo-addictive",
} as const;

export async function getDiscoverFeed(limit = 25, cursor?: string) {
  const agent = createAppViewAgent();
  const res = await agent.api.app.bsky.feed.getFeed({ feed: DISCOVER_FEED_URI, limit, cursor });
  return { items: onlyRootPosts(res.data.feed), cursor: res.data.cursor };
}

export async function getKeloAlgorithmFeed(
  level: keyof typeof KELO_ALGORITHM_FEED_URIS,
  limit = 25,
  cursor?: string
) {
  const feed = KELO_ALGORITHM_FEED_URIS[level];
  const params = new URLSearchParams({ feed, limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/xrpc/app.bsky.feed.getFeedSkeleton?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Kelo Feed Generator indisponible.");

  const skeleton = await response.json() as { feed?: Array<{ post: string }>; cursor?: string };
  const uris = (skeleton.feed || []).map((item) => item.post);
  if (!uris.length) return { items: [], cursor: skeleton.cursor };

  const agent = createAppViewAgent();
  const hydrated = await agent.api.app.bsky.feed.getPosts({ uris });
  const byUri = new Map(hydrated.data.posts.map((post: any) => [post.uri, { post }]));

  const items = uris
    .map((uri) => byUri.get(uri))
    .filter(Boolean);

  return { items, cursor: skeleton.cursor };
}

export async function getFollowingFeed(limit = 50, cursor?: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.feed.getTimeline({ limit, cursor });
  return { items: onlyRootPosts(res.data.feed), cursor: res.data.cursor };
}
