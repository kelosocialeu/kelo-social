"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "keloBookmarks";

/**
 * Gère la liste des publications conservées (localStorage pour l'instant).
 * Centralisé ici pour que Feed, Profil, Fil de publication et la page
 * Conservés partagent exactement le même état et comportement.
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  useEffect(() => {
    try {
      setBookmarks(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch {
      setBookmarks([]);
    }
  }, []);

  const isBookmarked = useCallback((uri: string) => bookmarks.some((p) => p.uri === uri), [bookmarks]);

  const toggleBookmark = useCallback((post: any) => {
    setBookmarks((prev) => {
      const exists = prev.some((p) => p.uri === post.uri);
      const next = exists ? prev.filter((p) => p.uri !== post.uri) : [post, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { bookmarks, isBookmarked, toggleBookmark };
}
