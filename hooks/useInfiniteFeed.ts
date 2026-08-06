"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
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
  /** Identifie chaque élément et évite les doublons entre les pages. */
  getItemKey?: (
    item: any
  ) => string | undefined;

  /**
   * Clé stable du cache partagé. Deux pages utilisant la même clé
   * réutilisent immédiatement les mêmes données.
   */
  cacheKey?: string;

  /** Durée pendant laquelle le cache est considéré comme frais. */
  staleTimeMs?: number;
}

const DEFAULT_STALE_TIME_MS = 30_000;

const infiniteFeedCache = new Map<
  string,
  InfiniteFeedCacheEntry
>();

const pendingInitialRequests = new Map<
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
    infiniteFeedCache.delete(cacheKey);
    pendingInitialRequests.delete(cacheKey);
    return;
  }

  infiniteFeedCache.clear();
  pendingInitialRequests.clear();
}

/**
 * Fil paginé avec cache mémoire partagé et actualisation silencieuse.
 *
 * - retour instantané vers une page déjà visitée ;
 * - déduplication des requêtes initiales simultanées ;
 * - conservation du curseur et des pages déjà chargées ;
 * - actualisation en arrière-plan lorsque les données sont anciennes.
 */
export function useInfiniteFeed(
  fetcher: FeedFetcher,
  deps: any[] = [],
  options: UseInfiniteFeedOptions = {}
) {
  const getItemKey =
    options.getItemKey ||
    defaultGetItemKey;

  const cacheKey = options.cacheKey;
  const staleTimeMs =
    options.staleTimeMs ??
    DEFAULT_STALE_TIME_MS;

  const initialCache = cacheKey
    ? infiniteFeedCache.get(cacheKey)
    : undefined;

  const [items, setItemsState] =
    useState<any[]>(
      initialCache?.items || []
    );

  const [cursor, setCursor] =
    useState<string | undefined>(
      initialCache?.cursor
    );

  const [initialLoading, setInitialLoading] =
    useState(
      !initialCache
    );

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
  const cursorRef = useRef<
    string | undefined
  >(initialCache?.cursor);
  const hasMoreRef = useRef(
    initialCache?.hasMore ?? true
  );
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);
  const itemsRef = useRef<any[]>(
    initialCache?.items || []
  );

  fetcherRef.current = fetcher;

  const writeCache = useCallback(
    (
      nextItems: any[],
      nextCursor: string | undefined,
      nextHasMore: boolean
    ) => {
      if (!cacheKey) {
        return;
      }

      infiniteFeedCache.set(cacheKey, {
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
      const moreAvailable =
        !!nextCursor &&
        pageItems.length > 0;

      itemsRef.current = nextItems;
      cursorRef.current = nextCursor;
      hasMoreRef.current = moreAvailable;

      setItemsState(nextItems);
      setCursor(nextCursor);
      setHasMore(moreAvailable);

      writeCache(
        nextItems,
        nextCursor,
        moreAvailable
      );
    },
    [getItemKey, writeCache]
  );

  const fetchInitialPage = useCallback(
    async (): Promise<FeedPage> => {
      if (!cacheKey) {
        return fetcherRef.current(undefined);
      }

      const pending =
        pendingInitialRequests.get(cacheKey);

      if (pending) {
        return pending;
      }

      const request =
        fetcherRef.current(undefined);

      pendingInitialRequests.set(
        cacheKey,
        request
      );

      try {
        return await request;
      } finally {
        pendingInitialRequests.delete(cacheKey);
      }
    },
    [cacheKey]
  );

  const reset = useCallback(async () => {
    const requestId =
      ++requestIdRef.current;

    const cached = cacheKey
      ? infiniteFeedCache.get(cacheKey)
      : undefined;

    const hasCachedItems =
      !!cached && cached.items.length > 0;

    setInitialLoading(!hasCachedItems);
    setRefreshing(hasCachedItems);
    setError(null);

    try {
      const page = await fetchInitialPage();

      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      applyPage(page, "replace");
    } catch (loadError) {
      if (
        requestId !==
        requestIdRef.current
      ) {
        return;
      }

      console.error(
        "Erreur de chargement du fil :",
        loadError
      );

      if (!hasCachedItems) {
        setError(
          "Impossible de charger le fil pour le moment."
        );
      }
    } finally {
      if (
        requestId ===
        requestIdRef.current
      ) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    applyPage,
    cacheKey,
    fetchInitialPage,
  ]);

  const refresh = useCallback(async () => {
    const requestId =
      ++requestIdRef.current;

    setRefreshing(true);
    setError(null);

    try {
      const page = await fetchInitialPage();

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
      }
    }
  }, [applyPage, fetchInitialPage]);

  const loadMore = useCallback(async () => {
    if (
      loadingMoreRef.current ||
      !hasMoreRef.current
    ) {
      return;
    }

    const currentCursor =
      cursorRef.current;

    if (!currentCursor) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    try {
      const page =
        await fetcherRef.current(
          currentCursor
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
    const cached = cacheKey
      ? infiniteFeedCache.get(cacheKey)
      : undefined;

    if (cached) {
      itemsRef.current = cached.items;
      cursorRef.current = cached.cursor;
      hasMoreRef.current = cached.hasMore;

      setItemsState(cached.items);
      setCursor(cached.cursor);
      setHasMore(cached.hasMore);
      setInitialLoading(false);

      const cacheIsFresh =
        Date.now() - cached.updatedAt <
        staleTimeMs;

      if (!cacheIsFresh) {
        refresh();
      }
    } else {
      reset();
    }

    return () => {
      requestIdRef.current += 1;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

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
