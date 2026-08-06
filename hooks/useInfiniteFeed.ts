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

type FeedPage = {
  items: any[];
  cursor?: string;
};

type FeedFetcher = (
  cursor?: string
) => Promise<FeedPage>;

interface InfiniteFeedCacheEntry {
  items: any[];
  cursor?: string;
  hasMore: boolean;
  updatedAt: number;
}

interface UseInfiniteFeedOptions {
  getItemKey?: (
    item: any
  ) => string | undefined;
  cacheKey?: string;
  staleTimeMs?: number;
  refreshOnFocus?: boolean;
}

const DEFAULT_STALE_TIME_MS = 30_000;

const cache = new Map<
  string,
  InfiniteFeedCacheEntry
>();

const pendingFirstPages = new Map<
  string,
  Promise<FeedPage>
>();

function defaultGetItemKey(
  item: any
): string | undefined {
  return (
    item?.uri ||
    item?.id ||
    item?.cid ||
    item?.notification?.uri
  );
}

function hashString(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

function serializeDependency(
  value: unknown
): string {
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
  getItemKey: (
    item: any
  ) => string | undefined
): any[] {
  const seen = new Set<string>();

  return [
    ...previousItems,
    ...newItems,
  ].filter((item) => {
    const key = getItemKey(item);

    if (!key) {
      return true;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function clearInfiniteFeedCache(
  cacheKey?: string
): void {
  if (cacheKey) {
    cache.delete(cacheKey);
    pendingFirstPages.delete(cacheKey);
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
  const getItemKey =
    options.getItemKey ||
    defaultGetItemKey;

  const automaticCacheKey = useMemo(
    () =>
      `feed:${hashString(
        fetcher.toString()
      )}:${deps
        .map(serializeDependency)
        .join("|")}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  const cacheKey =
    options.cacheKey ||
    automaticCacheKey;

  const staleTimeMs =
    options.staleTimeMs ??
    DEFAULT_STALE_TIME_MS;

  const refreshOnFocus =
    options.refreshOnFocus ?? true;

  const initialCache =
    cache.get(cacheKey);

  const [items, setItemsState] =
    useState<any[]>(
      initialCache?.items || []
    );

  const [cursor, setCursor] =
    useState<string | undefined>(
      initialCache?.cursor
    );

  const [initialLoading, setInitialLoading] =
    useState(!initialCache);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [hasMore, setHasMore] =
    useState(
      initialCache?.hasMore ?? true
    );

  const [error, setError] =
    useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  const itemsRef = useRef<any[]>(
    initialCache?.items || []
  );
  const cursorRef = useRef<
    string | undefined
  >(initialCache?.cursor);
  const hasMoreRef = useRef(
    initialCache?.hasMore ?? true
  );
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);

  fetcherRef.current = fetcher;

  const writeCache = useCallback(
    (
      nextItems: any[],
      nextCursor: string | undefined,
      nextHasMore: boolean
    ) => {
      cache.set(cacheKey, {
        items: nextItems,
        cursor: nextCursor,
        hasMore: nextHasMore,
        updatedAt: Date.now(),
      });
    },
    [cacheKey]
  );

  const setItems: Dispatch<
    SetStateAction<any[]>
  > = useCallback(
    (action) => {
      setItemsState((previousItems) => {
        const nextItems =
          typeof action === "function"
            ? action(previousItems)
            : action;

        itemsRef.current = nextItems;

        writeCache(
          nextItems,
          cursorRef.current,
          hasMoreRef.current
        );

        return nextItems;
      });
    },
    [writeCache]
  );

  const applyPage = useCallback(
    (
      page: FeedPage,
      mode: "replace" | "append"
    ) => {
      const pageItems = page.items || [];

      const nextItems =
        mode === "replace"
          ? mergeWithoutDuplicates(
              [],
              pageItems,
              getItemKey
            )
          : mergeWithoutDuplicates(
              itemsRef.current,
              pageItems,
              getItemKey
            );

      const nextCursor = page.cursor;
      const nextHasMore =
        !!nextCursor &&
        pageItems.length > 0;

      itemsRef.current = nextItems;
      cursorRef.current = nextCursor;
      hasMoreRef.current = nextHasMore;

      setItemsState(nextItems);
      setCursor(nextCursor);
      setHasMore(nextHasMore);

      writeCache(
        nextItems,
        nextCursor,
        nextHasMore
      );
    },
    [getItemKey, writeCache]
  );

  const fetchFirstPage = useCallback(
    async (): Promise<FeedPage> => {
      const pending =
        pendingFirstPages.get(cacheKey);

      if (pending) {
        return pending;
      }

      const request =
        fetcherRef.current(undefined);

      pendingFirstPages.set(
        cacheKey,
        request
      );

      try {
        return await request;
      } finally {
        pendingFirstPages.delete(cacheKey);
      }
    },
    [cacheKey]
  );

  const refresh = useCallback(async () => {
    const requestId =
      ++requestIdRef.current;

    setRefreshing(true);
    setError(null);

    try {
      const page = await fetchFirstPage();

      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      applyPage(page, "replace");
    } catch (refreshError) {
      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      console.error(
        "Erreur de rafraîchissement du fil :",
        refreshError
      );

      if (itemsRef.current.length === 0) {
        setError(
          "Impossible d’actualiser le fil."
        );
      }
    } finally {
      if (
        requestId ===
        requestIdRef.current
      ) {
        setRefreshing(false);
        setInitialLoading(false);
      }
    }
  }, [applyPage, fetchFirstPage]);

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
    if (
      loadingMoreRef.current ||
      !hasMoreRef.current ||
      !cursorRef.current
    ) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const page =
        await fetcherRef.current(
          cursorRef.current
        );

      applyPage(page, "append");
    } catch (loadMoreError) {
      console.error(
        "Erreur de chargement supplémentaire :",
        loadMoreError
      );

      setError(
        "Impossible de charger davantage de publications."
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [applyPage]);

  useEffect(() => {
    const cached = cache.get(cacheKey);

    if (cached) {
      itemsRef.current = cached.items;
      cursorRef.current = cached.cursor;
      hasMoreRef.current = cached.hasMore;

      setItemsState(cached.items);
      setCursor(cached.cursor);
      setHasMore(cached.hasMore);
      setInitialLoading(false);

      if (
        Date.now() - cached.updatedAt >=
        staleTimeMs
      ) {
        refresh();
      }
    } else {
      setInitialLoading(true);
      refresh();
    }

    return () => {
      requestIdRef.current += 1;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!refreshOnFocus) {
      return;
    }

    const handleFocus = () => {
      const cached = cache.get(cacheKey);

      if (
        !cached ||
        Date.now() - cached.updatedAt >=
          staleTimeMs
      ) {
        refresh();
      }
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    cacheKey,
    refresh,
    refreshOnFocus,
    staleTimeMs,
  ]);

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
