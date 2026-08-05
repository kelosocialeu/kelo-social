"use client";

import {
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

interface UseInfiniteFeedOptions {
  /**
   * Fonction permettant d’identifier un élément.
   * Évite les doublons entre deux pages.
   */
  getItemKey?: (item: any) => string | undefined;
}

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
  getItemKey: (item: any) => string | undefined
): any[] {
  const seen = new Set<string>();

  const merged = [
    ...previousItems,
    ...newItems,
  ];

  return merged.filter((item, index) => {
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

/**
 * Fil paginé avec préchargement infini.
 *
 * Compatible PC, tablette et mobile.
 *
 * Sépare :
 * - le premier chargement ;
 * - le chargement en arrière-plan ;
 * - le rafraîchissement ;
 * - les erreurs initiales et secondaires.
 */
export function useInfiniteFeed(
  fetcher: FeedFetcher,
  deps: any[] = [],
  options: UseInfiniteFeedOptions = {}
) {
  const getItemKey =
    options.getItemKey || defaultGetItemKey;

  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] =
    useState<string | undefined>(undefined);

  const [initialLoading, setInitialLoading] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  const cursorRef = useRef<
    string | undefined
  >(undefined);

  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const requestIdRef = useRef(0);

  fetcherRef.current = fetcher;

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const applyPage = useCallback(
    (
      page: FeedPage,
      mode: "replace" | "append"
    ) => {
      setItems((previousItems) =>
        mode === "replace"
          ? mergeWithoutDuplicates(
              [],
              page.items || [],
              getItemKey
            )
          : mergeWithoutDuplicates(
              previousItems,
              page.items || [],
              getItemKey
            )
      );

      const nextCursor = page.cursor;

      setCursor(nextCursor);
      cursorRef.current = nextCursor;

      const moreAvailable =
        !!nextCursor &&
        (page.items?.length || 0) > 0;

      setHasMore(moreAvailable);
      hasMoreRef.current = moreAvailable;
    },
    [getItemKey]
  );

  const reset = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setInitialLoading(true);
    setError(null);
    setHasMore(true);
    hasMoreRef.current = true;

    try {
      const page =
        await fetcherRef.current(undefined);

      if (requestId !== requestIdRef.current) {
        return;
      }

      applyPage(page, "replace");
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        "Erreur de chargement du fil :",
        error
      );

      setError(
        "Impossible de charger le fil pour le moment."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setInitialLoading(false);
      }
    }
  }, [applyPage]);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setRefreshing(true);
    setError(null);

    try {
      const page =
        await fetcherRef.current(undefined);

      if (requestId !== requestIdRef.current) {
        return;
      }

      applyPage(page, "replace");
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error(
        "Erreur de rafraîchissement du fil :",
        error
      );

      setError(
        "Impossible d’actualiser le fil."
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setRefreshing(false);
      }
    }
  }, [applyPage]);

  const loadMore = useCallback(async () => {
    if (
      loadingMoreRef.current ||
      !hasMoreRef.current
    ) {
      return;
    }

    const currentCursor = cursorRef.current;

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
    } catch (error) {
      console.error(
        "Erreur de chargement supplémentaire :",
        error
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
    reset();

    return () => {
      requestIdRef.current += 1;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    items,
    setItems,

    /**
     * Compatibilité avec les pages existantes.
     * `loading` reste vrai uniquement au premier chargement.
     */
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
