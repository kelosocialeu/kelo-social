import { createAppViewAgent } from "@/lib/atproto/appview";

interface SearchCacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface SearchPage<T> {
  items: T[];
  cursor?: string;
}

const SEARCH_CACHE_MS = 60_000;
const RETRY_DELAYS_MS = [350, 900];

const postsCache = new Map<string, SearchCacheEntry<any[]>>();
const actorsCache = new Map<string, SearchCacheEntry<any[]>>();
const pendingPosts = new Map<string, Promise<any[]>>();
const pendingActors = new Map<string, Promise<any[]>>();

function normalizeQuery(query: string): string {
  return query.trim();
}

function makeKey(query: string, limit: number): string {
  return `${normalizeQuery(query).toLowerCase()}:${limit}`;
}

function getFresh<T>(cache: Map<string, SearchCacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) return undefined;
  return entry.value;
}

function getStale<T>(cache: Map<string, SearchCacheEntry<T>>, key: string): T | undefined {
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
      if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
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

function buildPostSearchParams(query: string, limit: number, cursor?: string) {
  const trimmed = normalizeQuery(query);
  const hashtagOnly = /^#[\p{L}\p{N}_-]+$/u.test(trimmed);
  const params: Record<string, unknown> = {
    q: hashtagOnly ? trimmed.slice(1) : trimmed,
    limit: Math.min(Math.max(limit, 1), 100),
  };
  if (hashtagOnly) params.tag = [trimmed.slice(1)];
  if (cursor) params.cursor = cursor;
  return params;
}

export async function searchNetworkPostsPage(
  query: string,
  limit = 50,
  cursor?: string
): Promise<SearchPage<any>> {
  const trimmed = normalizeQuery(query);
  if (trimmed.length < 2) return { items: [] };

  const agent = createAppViewAgent();
  const response = await withRetry(() =>
    agent.api.app.bsky.feed.searchPosts(buildPostSearchParams(trimmed, limit, cursor) as any)
  );

  return {
    items: response.data.posts || [],
    cursor: response.data.cursor || undefined,
  };
}

export async function searchNetworkActorsPage(
  query: string,
  limit = 50,
  cursor?: string
): Promise<SearchPage<any>> {
  const trimmed = normalizeQuery(query);
  if (trimmed.length < 2) return { items: [] };

  const agent = createAppViewAgent();
  const response = await withRetry(() =>
    agent.api.app.bsky.actor.searchActors({
      q: trimmed,
      limit: Math.min(Math.max(limit, 1), 100),
      ...(cursor ? { cursor } : {}),
    } as any)
  );

  return {
    items: response.data.actors || [],
    cursor: response.data.cursor || undefined,
  };
}

/** Recherche de publications sur tout le réseau fédéré. */
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
      const page = await searchNetworkPostsPage(normalized, limit);
      postsCache.set(key, { value: page.items, expiresAt: Date.now() + SEARCH_CACHE_MS });
      return page.items;
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
      const page = await searchNetworkActorsPage(normalized, limit);
      actorsCache.set(key, { value: page.items, expiresAt: Date.now() + SEARCH_CACHE_MS });
      return page.items;
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
