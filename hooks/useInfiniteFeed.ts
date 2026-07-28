"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FeedFetcher = (cursor?: string) => Promise<{ items: any[]; cursor?: string }>;

/**
 * Gère un fil paginé par curseur (pattern standard AT Protocol) avec
 * chargement infini : charge la première page au montage / changement de
 * dépendances, puis expose loadMore() pour charger la suite.
 */
export function useInfiniteFeed(fetcher: FeedFetcher, deps: any[] = []) {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reset = useCallback(async () => {
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    setError(null);
    setLoading(true);
    try {
      const res = await fetcherRef.current(undefined);
      setItems(res.items);
      setCursor(res.cursor);
      setHasMore(!!res.cursor && res.items.length > 0);
    } catch (err) {
      console.error("Erreur de chargement du fil :", err);
      setError("Impossible de charger le fil pour le moment.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetcherRef.current(cursor);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.cursor);
      setHasMore(!!res.cursor && res.items.length > 0);
    } catch (err) {
      console.error("Erreur de chargement du fil :", err);
      setError("Impossible de charger davantage de publications.");
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { items, setItems, loading, hasMore, error, loadMore };
}
