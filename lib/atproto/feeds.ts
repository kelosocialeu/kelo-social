import { getReadAgent } from "@/lib/atproto/read-agent";
import { getStoredSession, resumeAgentSession } from "@/services/auth.service";

async function getWriteAgent() {
  const session = getStoredSession();
  if (!session) throw new Error("Vous devez être connecté.");
  return resumeAgentSession(session);
}

export interface SavedFeedItem {
  id: string;
  type: string;
  value: string;
  pinned: boolean;
}

const SAVED_FEEDS_TYPE = "app.bsky.actor.defs#savedFeedsPrefV2";

async function getPreferences(): Promise<any[]> {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.actor.getPreferences();
  return res.data.preferences;
}

async function putPreferences(preferences: any[]): Promise<void> {
  const agent = await getWriteAgent();
  await agent.api.app.bsky.actor.putPreferences({ preferences }, { encoding: "application/json" });
}

/** Fils d'actu enregistrés par l'utilisateur (préférence AT Protocol, synchronisée sur tout le réseau). */
export async function getSavedFeedItems(): Promise<SavedFeedItem[]> {
  const prefs = await getPreferences();
  const pref = prefs.find((p) => p.$type === SAVED_FEEDS_TYPE);
  return pref?.items || [];
}

/** Résout les métadonnées (nom, avatar, description) d'une liste de fils par leur URI. */
export async function getFeedGenerators(uris: string[]) {
  if (uris.length === 0) return [];
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.feed.getFeedGenerators({ feeds: uris });
  return res.data.feeds;
}

/** Fils d'actu populaires du réseau fédéré, avec recherche optionnelle. */
export async function getPopularFeeds(query?: string, limit = 20) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.unspecced.getPopularFeedGenerators({ query, limit });
  return res.data.feeds;
}

export async function saveFeed(uri: string): Promise<void> {
  const prefs = await getPreferences();
  const pref = prefs.find((p) => p.$type === SAVED_FEEDS_TYPE);
  const items: SavedFeedItem[] = pref?.items || [];
  if (items.some((i) => i.value === uri)) return;

  const newItem: SavedFeedItem = { id: `${Date.now()}`, type: "feed", value: uri, pinned: false };
  const filtered = prefs.filter((p) => p.$type !== SAVED_FEEDS_TYPE);
  filtered.push({ $type: SAVED_FEEDS_TYPE, items: [...items, newItem] });
  await putPreferences(filtered);
}

export async function removeFeed(uri: string): Promise<void> {
  const prefs = await getPreferences();
  const pref = prefs.find((p) => p.$type === SAVED_FEEDS_TYPE);
  const items: SavedFeedItem[] = (pref?.items || []).filter((i: SavedFeedItem) => i.value !== uri);
  const filtered = prefs.filter((p) => p.$type !== SAVED_FEEDS_TYPE);
  filtered.push({ $type: SAVED_FEEDS_TYPE, items });
  await putPreferences(filtered);
}

export async function togglePinFeed(uri: string): Promise<void> {
  const prefs = await getPreferences();
  const pref = prefs.find((p) => p.$type === SAVED_FEEDS_TYPE);
  const items: SavedFeedItem[] = (pref?.items || []).map((i: SavedFeedItem) =>
    i.value === uri ? { ...i, pinned: !i.pinned } : i
  );
  const filtered = prefs.filter((p) => p.$type !== SAVED_FEEDS_TYPE);
  filtered.push({ $type: SAVED_FEEDS_TYPE, items });
  await putPreferences(filtered);
}

/** Publications d'un fils d'actu (generator) donné, avec pagination par curseur. */
export async function getFeedPosts(feedUri: string, limit = 25, cursor?: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.feed.getFeed({ feed: feedUri, limit, cursor });
  return { items: res.data.feed, cursor: res.data.cursor };
}
