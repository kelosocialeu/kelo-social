"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type FeedPage = { items: any[]; cursor?: string };
type FeedFetcher = (cursor?: string) => Promise<FeedPage>;

interface InfiniteFeedCacheEntry {
  items: any[];
  cursor?: string;
  hasMore: boolean;
  updatedAt: number;
}

interface UseInfiniteFeedOptions {
  getItemKey?: (item: any) => string | undefined;
  cacheKey?: string;
  staleTimeMs?: number;
  refreshOnFocus?: boolean;
}

const DEFAULT_STALE_TIME_MS = 30_000;
const RETRY_DELAYS = [400, 1200, 2500];
const BACKGROUND_RETRY_MS = 5000;
const cache = new Map<string, InfiniteFeedCacheEntry>();
const pendingFirstPages = new Map<string, Promise<FeedPage>>();

function defaultGetItemKey(item: any): string | undefined {
  return item?.uri || item?.id || item?.cid || item?.notification?.uri;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function serializeDependency(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return typeof value;
  }
}

function mergeWithoutDuplicates(
  previousItems: any[],
  newItems: any[],
  getItemKey: (item: any) => string | undefined
): any[] {
  const seen = new Set<string>();
  return [...previousItems, ...newItems].filter((item) => {
    const key = getItemKey(item);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function storageKey(cacheKey: string) {
  return `kelo-feed-cache:${cacheKey}`;
}

function readPersistentCache(cacheKey: string): InfiniteFeedCacheEntry | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(storageKey(cacheKey));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as InfiniteFeedCacheEntry;
    if (!Array.isArray(parsed?.items)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writePersistentCache(cacheKey: string, entry: InfiniteFeedCacheEntry) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(cacheKey), JSON.stringify(entry));
  } catch {
    // Le cache mémoire continue de fonctionner si localStorage est indisponible.
  }
}

export function clearInfiniteFeedCache(cacheKey?: string): void {
  if (cacheKey) {
    cache.delete(cacheKey);
    pendingFirstPages.delete(cacheKey);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey(cacheKey));
      } catch {}
    }
    return;
  }
  cache.clear();
  pendingFirstPages.clear();
}

export function useInfiniteFeed(
  fetcher: FeedFetcher,
  deps: any[] = [],
  options: UseInfiniteFeedOptions = {}
) {
  const getItemKey = options.getItemKey || defaultGetItemKey;
  const automaticCacheKey = useMemo(
    () =>
      `feed:${hashString(fetcher.toString())}:${deps
        .map(serializeDependency)
        .join("|")}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
  const cacheKey = options.cacheKey || automaticCacheKey;
  const staleTimeMs = options.staleTimeMs ?? DEFAULT_STALE_TIME_MS;
  const refreshOnFocus = options.refreshOnFocus ?? true;

  const initialCache = cache.get(cacheKey);
  const [items, setItemsState] = useState<any[]>(initialCache?.items || []);
  const [cursor, setCursor] = useState<string | undefined>(initialCache?.cursor);
  const [initialLoading, setInitialLoading] = useState(!initialCache);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(initialCache?.hasMore ?? true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  const itemsRef = useRef<any[]>(initialCache?.items || []);
  const cursorRef = useRef<string | undefined>(initialCache?.cursor);
  const hasMoreRef = useRef(initialCache?.hasMore ?? true);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);

  fetcherRef.current = fetcher;

  const writeCache = useCallback(
    (nextItems: any[], nextCursor: string | undefined, nextHasMore: boolean) => {
      const entry: InfiniteFeedCacheEntry = {
        items: nextItems,
        cursor: nextCursor,
        hasMore: nextHasMore,
        updatedAt: Date.now(),
      };
      cache.set(cacheKey, entry);
      writePersistentCache(cacheKey, entry);
    },
    [cacheKey]
  );

  const setItems: Dispatch<SetStateAction<any[]>> = useCallback(
    (action) => {
      setItemsState((previousItems) => {
        const nextItems =
          typeof action === "function" ? action(previousItems) : action;
        itemsRef.current = nextItems;
        writeCache(nextItems, cursorRef.current, hasMoreRef.current);
        return nextItems;
      });
    },
    [writeCache]
  );

  const applyPage = useCallback(
    (page: FeedPage, mode: "replace" | "append") => {
      const pageItems = page.items || [];
      const nextItems =
        mode === "replace"
          ? mergeWithoutDuplicates([], pageItems, getItemKey)
          : mergeWithoutDuplicates(itemsRef.current, pageItems, getItemKey);
      const nextCursor = page.cursor;
      const nextHasMore = !!nextCursor && pageItems.length > 0;

      itemsRef.current = nextItems;
      cursorRef.current = nextCursor;
      hasMoreRef.current = nextHasMore;
      setItemsState(nextItems);
      setCursor(nextCursor);
      setHasMore(nextHasMore);
      setError(null);
      writeCache(nextItems, nextCursor, nextHasMore);
    },
    [getItemKey, writeCache]
  );

  const fetchFirstPage = useCallback(async (): Promise<FeedPage> => {
    const pending = pendingFirstPages.get(cacheKey);
    if (pending) return pending;

    const request = (async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
        try {
          return await fetcherRef.current(undefined);
        } catch (err) {
          lastError = err;
          if (attempt < RETRY_DELAYS.length) {
            await sleep(RETRY_DELAYS[attempt]);
          }
        }
      }
      throw lastError;
    })();

    pendingFirstPages.set(cacheKey, request);
    try {
      return await request;
    } finally {
      pendingFirstPages.delete(cacheKey);
    }
  }, [cacheKey]);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setRefreshing(true);
    setError(null);

    try {
      const page = await fetchFirstPage();
      if (requestId !== requestIdRef.current) return;
      applyPage(page, "replace");
    } catch (refreshError) {
      if (requestId !== requestIdRef.current) return;

      console.warn("Rafraîchissement temporairement indisponible, conservation du dernier fil :", refreshError);

      const persistent = readPersistentCache(cacheKey);
      if (itemsRef.current.length === 0 && persistent?.items?.length) {
        itemsRef.current = persistent.items;
        cursorRef.current = persistent.cursor;
        hasMoreRef.current = persistent.hasMore;
        cache.set(cacheKey, persistent);
        setItemsState(persistent.items);
        setCursor(persistent.cursor);
        setHasMore(persistent.hasMore);
      }

      // Pas de message rouge : Kelo réessaie automatiquement en arrière-plan.
      setError(null);
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(() => {
        void refresh();
      }, BACKGROUND_RETRY_MS);
    } finally {
      if (requestId === requestIdRef.current) {
        setRefreshing(false);
        setInitialLoading(false);
      }
    }
  }, [applyPage, cacheKey, fetchFirstPage]);

  const reset = useCallback(async () => {
    cache.delete(cacheKey);
    itemsRef.current = [];
    cursorRef.current = undefined;
    hasMoreRef.current = true;
    setItemsState([]);
    setCursor(undefined);
    setHasMore(true);
    setInitialLoading(true);
    await refresh();
  }, [cacheKey, refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || !cursorRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const page = await fetcherRef.current(cursorRef.current);
      applyPage(page, "append");
    } catch (loadMoreError) {
      console.warn("Chargement supplémentaire temporairement indisponible :", loadMoreError);
      setError(null);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [applyPage]);

  useEffect(() => {
    const memoryCached = cache.get(cacheKey);
    const persistentCached = memoryCached || readPersistentCache(cacheKey);

    if (persistentCached) {
      cache.set(cacheKey, persistentCached);
      itemsRef.current = persistentCached.items;
      cursorRef.current = persistentCached.cursor;
      hasMoreRef.current = persistentCached.hasMore;
      setItemsState(persistentCached.items);
      setCursor(persistentCached.cursor);
      setHasMore(persistentCached.hasMore);
      setInitialLoading(false);

      if (Date.now() - persistentCached.updatedAt >= staleTimeMs) {
        void refresh();
      }
    } else {
      setInitialLoading(true);
      void refresh();
    }

    return () => {
      requestIdRef.current += 1;
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!refreshOnFocus) return;

    const triggerRefresh = () => {
      const cached = cache.get(cacheKey);
      if (!cached || Date.now() - cached.updatedAt >= staleTimeMs) {
        void refresh();
      }
    };

    window.addEventListener("focus", triggerRefresh);
    window.addEventListener("online", triggerRefresh);
    return () => {
      window.removeEventListener("focus", triggerRefresh);
      window.removeEventListener("online", triggerRefresh);
    };
  }, [cacheKey, refresh, refreshOnFocus, staleTimeMs]);

  return {
    items,
    setItems,
    loading: initialLoading,
    initialLoading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
    reset,
  };
}
