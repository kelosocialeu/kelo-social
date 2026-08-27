interface SearchCacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface SearchPage<T> {
  items: T[];
  cursor?: string;
}

const SEARCH_CACHE_MS = 60_000;

const postsCache = new Map<string, SearchCacheEntry<any[]>>();
const actorsCache = new Map<string, SearchCacheEntry<any[]>>();

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

export function clearSearchCache(): void {
  postsCache.clear();
  actorsCache.clear();
}

async function requestSearchPage(
  type: "posts" | "accounts",
  query: string,
  limit: number,
  cursor?: string
): Promise<SearchPage<any>> {
  const trimmed = normalizeQuery(query);
  if (trimmed.length < 2) return { items: [] };

  const params = new URLSearchParams({
    type,
    q: trimmed,
    limit: String(Math.min(Math.max(limit, 1), 100)),
  });
  if (cursor) params.set("cursor", cursor);

  const response = await fetch(`/api/search?${params.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "La recherche fédérée est temporairement indisponible."
    );
  }

  return {
    items: Array.isArray(data.items) ? data.items : [],
    cursor: typeof data.cursor === "string" && data.cursor ? data.cursor : undefined,
  };
}

export function searchNetworkPostsPage(query: string, limit = 50, cursor?: string) {
  return requestSearchPage("posts", query, limit, cursor);
}

export function searchNetworkActorsPage(query: string, limit = 50, cursor?: string) {
  return requestSearchPage("accounts", query, limit, cursor);
}

export async function searchNetworkPosts(query: string, limit = 25) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return [];

  const key = makeKey(normalized, limit);
  const cached = getFresh(postsCache, key);
  if (cached) return cached;

  const page = await searchNetworkPostsPage(normalized, limit);
  postsCache.set(key, { value: page.items, expiresAt: Date.now() + SEARCH_CACHE_MS });
  return page.items;
}

export async function searchNetworkActors(query: string, limit = 6) {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return [];

  const key = makeKey(normalized, limit);
  const cached = getFresh(actorsCache, key);
  if (cached) return cached;

  const page = await searchNetworkActorsPage(normalized, limit);
  actorsCache.set(key, { value: page.items, expiresAt: Date.now() + SEARCH_CACHE_MS });
  return page.items;
}
