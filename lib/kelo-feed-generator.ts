import { AtpAgent } from "@atproto/api";

const APPVIEW_URL = "https://public.api.bsky.app";
const SOURCE_FEED = "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";

export const KELO_FEED_GENERATOR_DID =
  process.env.KELO_FEED_GENERATOR_SERVICE_DID || "did:web:kelosocial.eu";

export const KELO_FEED_SERVICE_URL =
  process.env.KELO_FEED_GENERATOR_SERVICE_URL || "https://kelosocial.eu";

export const KELO_FEED_URIS = {
  "very-low": `at://${KELO_FEED_GENERATOR_DID}/app.bsky.feed.generator/kelo-very-low`,
  medium: `at://${KELO_FEED_GENERATOR_DID}/app.bsky.feed.generator/kelo-medium`,
  "medium-addictive": `at://${KELO_FEED_GENERATOR_DID}/app.bsky.feed.generator/kelo-medium-addictive`,
  addictive: `at://${KELO_FEED_GENERATOR_DID}/app.bsky.feed.generator/kelo-addictive`,
} as const;

type Level = keyof typeof KELO_FEED_URIS;

const WEIGHTS: Record<Level, { engagement: number; freshness: number; exploration: number }> = {
  "very-low": { engagement: 1, freshness: 2, exploration: 4 },
  medium: { engagement: 2, freshness: 3, exploration: 3 },
  "medium-addictive": { engagement: 3, freshness: 4, exploration: 2 },
  addictive: { engagement: 4, freshness: 5, exploration: 1 },
};

function levelFromUri(uri: string): Level {
  const key = (Object.entries(KELO_FEED_URIS).find(([, value]) => value === uri)?.[0] || "medium") as Level;
  return key;
}

function languageScore(langs: unknown, acceptLanguage: string) {
  if (!Array.isArray(langs) || !acceptLanguage) return 0;
  const wanted = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean)
    .map((value) => value.split("-")[0]);
  return langs.some((lang) => wanted.includes(String(lang).toLowerCase().split("-")[0])) ? 1 : 0;
}

function scorePost(post: any, index: number, level: Level, acceptLanguage: string) {
  const weights = WEIGHTS[level];
  const record = post.record || {};
  const text = String(record.text || "");
  const engagement = Math.log1p(
    Number(post.likeCount || 0) +
    Number(post.repostCount || 0) * 2 +
    Number(post.replyCount || 0) * 1.5
  );
  const createdAt = new Date(record.createdAt || Date.now()).getTime();
  const ageHours = Math.max(0, (Date.now() - createdAt) / 3600000);
  const freshness = 1 / (1 + ageHours);
  const exploration = ((index * 17 + text.length * 13) % 100) / 100;
  const language = languageScore(record.langs, acceptLanguage);

  return (
    language * 8 +
    engagement * weights.engagement +
    freshness * weights.freshness +
    exploration * weights.exploration
  );
}

export async function getKeloFeedSkeleton(feedUri: string, limit: number, cursor: string | undefined, acceptLanguage: string) {
  const level = levelFromUri(feedUri);
  const agent = new AtpAgent({ service: APPVIEW_URL });
  const response = await agent.api.app.bsky.feed.getFeed({
    feed: SOURCE_FEED,
    limit: Math.min(Math.max(limit * 3, 50), 100),
    cursor,
  });

  const posts = response.data.feed.filter((item: any) => !item?.post?.record?.reply);
  const ranked = posts
    .map((item: any, index: number) => ({ uri: item.post.uri, score: scorePost(item.post, index, level, acceptLanguage) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    feed: ranked.map(({ uri }) => ({ post: uri })),
    cursor: response.data.cursor,
  };
}
