import { createAppViewAgent } from "@/lib/atproto/appview";

interface SearchCacheEntry<T> {
  value: T;
  expiresAt: number;
}

const SEARCH_CACHE_MS = 60_000;
const RETRY_DELAYS_MS = [350, 900];

const postsCache = new Map<string, SearchCacheEntry<any[]>>();
const actorsCache = new Map<string, SearchCacheEntry<any[]>>();
const pendingPosts = new Map<string, Promise<any[]>>();
const pendingActors = new Map<string, Promise<any[]>>();

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function makeKey(query: string, limit: number): string {
  return `${normalizeQuery(query)}:${limit}`;
}

function getFresh<T>(
  cache: Map<string, SearchCacheEntry<T>>,
  key: string
): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    return undefined;
  }

  return entry.value;
}

function getStale<T>(
  cache: Map<string, SearchCacheEntry<T>>,
  key: string
): T | undefined {
  return cache.get(key)?.value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
  }

  throw lastError;
}

export function clearSearchCache(): void {
  postsCache.clear();
  actorsCache.clear();
  pendingPosts.clear();
  pendingActors.clear();
}

/**
 * Recherche de publications sur tout le réseau fédéré.
 * Les recherches passent directement par l'AppView publique : un PDS
 * utilisateur n'expose pas forcément les endpoints de recherche globale.
 */
export async function searchNetworkPosts(query: string, limit = 25) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return [];

  const key = makeKey(normalized, limit);
  const cached = getFresh(postsCache, key);
  if (cached) return cached;

  const pending = pendingPosts.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const agent = createAppViewAgent();
      const response = await withRetry(() =>
        agent.api.app.bsky.feed.searchPosts({
          q: normalized,
          limit,
        })
      );

      const value = response.data.posts || [];
      postsCache.set(key, {
        value,
        expiresAt: Date.now() + SEARCH_CACHE_MS,
      });
      return value;
    } catch (error) {
      console.warn("Recherche de publications temporairement indisponible :", error);
      return getStale(postsCache, key) || [];
    }
  })();

  pendingPosts.set(key, request);
  try {
    return await request;
  } finally {
    pendingPosts.delete(key);
  }
}

/** Recherche de comptes sur tout le réseau fédéré. */
export async function searchNetworkActors(query: string, limit = 6) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return [];

  const key = makeKey(normalized, limit);
  const cached = getFresh(actorsCache, key);
  if (cached) return cached;

  const pending = pendingActors.get(key);
  if (pending) return pending;

  const request = (async () => {
    try {
      const agent = createAppViewAgent();
      const response = await withRetry(() =>
        agent.api.app.bsky.actor.searchActors({
          q: normalized,
          limit,
        })
      );

      const value = response.data.actors || [];
      actorsCache.set(key, {
        value,
        expiresAt: Date.now() + SEARCH_CACHE_MS,
      });
      return value;
    } catch (error) {
      console.warn("Recherche de comptes temporairement indisponible :", error);
      return getStale(actorsCache, key) || [];
    }
  })();

  pendingActors.set(key, request);
  try {
    return await request;
  } finally {
    pendingActors.delete(key);
  }
}
