import { getReadAgent } from "@/lib/atproto/read-agent";

interface SearchCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const SEARCH_CACHE_MS = 60_000;

const postsCache = new Map<
  string,
  SearchCacheEntry<any[]>
>();

const actorsCache = new Map<
  string,
  SearchCacheEntry<any[]>
>();

const pendingPosts = new Map<
  string,
  Promise<any[]>
>();

const pendingActors = new Map<
  string,
  Promise<any[]>
>();

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function makeKey(
  query: string,
  limit: number
): string {
  return `${normalizeQuery(query)}:${limit}`;
}

function getFresh<T>(
  cache: Map<string, SearchCacheEntry<T>>,
  key: string
): T | undefined {
  const entry = cache.get(key);

  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  return entry.value;
}

export function clearSearchCache(): void {
  postsCache.clear();
  actorsCache.clear();
  pendingPosts.clear();
  pendingActors.clear();
}

/** Recherche de publications sur l'ensemble du réseau fédéré. */
export async function searchNetworkPosts(
  query: string,
  limit = 25
) {
  const normalized = normalizeQuery(query);

  if (normalized.length < 2) return [];

  const key = makeKey(normalized, limit);
  const cached = getFresh(postsCache, key);

  if (cached) return cached;

  const pending = pendingPosts.get(key);
  if (pending) return pending;

  const request = (async () => {
    const agent = await getReadAgent();
    const response =
      await agent.api.app.bsky.feed.searchPosts({
        q: normalized,
        limit,
      });

    const value = response.data.posts;

    postsCache.set(key, {
      value,
      expiresAt: Date.now() + SEARCH_CACHE_MS,
    });

    return value;
  })();

  pendingPosts.set(key, request);

  try {
    return await request;
  } finally {
    pendingPosts.delete(key);
  }
}

/** Recherche de comptes sur l'ensemble du réseau fédéré. */
export async function searchNetworkActors(
  query: string,
  limit = 6
) {
  const normalized = normalizeQuery(query);

  if (normalized.length < 2) return [];

  const key = makeKey(normalized, limit);
  const cached = getFresh(actorsCache, key);

  if (cached) return cached;

  const pending = pendingActors.get(key);
  if (pending) return pending;

  const request = (async () => {
    const agent = await getReadAgent();
    const response =
      await agent.api.app.bsky.actor.searchActors({
        q: normalized,
        limit,
      });

    const value = response.data.actors;

    actorsCache.set(key, {
      value,
      expiresAt: Date.now() + SEARCH_CACHE_MS,
    });

    return value;
  })();

  pendingActors.set(key, request);

  try {
    return await request;
  } finally {
    pendingActors.delete(key);
  }
}
