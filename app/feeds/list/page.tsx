"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useBookmarks } from "@/hooks/useBookmarks";

import {
  getListInfo,
  getListFeedPosts,
} from "@/lib/atproto/lists";

function formatFeed(feed: any[]) {
  return feed.map((item: any) => ({
    uri: item.post.uri,
    cid: item.post.cid,
    author: item.post.author,
    record: item.post.record,
    embed: item.post.embed,
    likeCount: item.post.likeCount || 0,
    repostCount: item.post.repostCount || 0,
    replyCount: item.post.replyCount || 0,
    viewer: item.post.viewer || {},
    repostedBy:
      item.reason?.$type ===
      "app.bsky.feed.defs#reasonRepost"
        ? item.reason.by
        : null,
  }));
}

function ListViewContent() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const listUri = searchParams.get("uri") || "";

  const [list, setList] = useState<any>(null);
  const [listError, setListError] =
    useState<string | null>(null);

  const {
    isBookmarked,
    toggleBookmark,
  } = useBookmarks();

  useEffect(() => {
    if (!checked || !listUri) {
      return;
    }

    setListError(null);

    getListInfo(listUri)
      .then(setList)
      .catch((error) => {
        console.error(
          "Impossible de charger les informations de la liste :",
          error
        );

        setListError(
          "Impossible de charger cette liste."
        );
      });
  }, [checked, listUri]);

  const fetcher = useCallback(
    async (cursor?: string) => {
      if (!checked || !listUri) {
        return {
          items: [],
          cursor: undefined,
        };
      }

      const {
        items,
        cursor: nextCursor,
      } = await getListFeedPosts(
        listUri,
        25,
        cursor
      );

      return {
        items: formatFeed(items),
        cursor: nextCursor,
      };
    },
    [checked, listUri]
  );

  const {
    items: posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
  } = useInfiniteFeed(
    fetcher,
    [checked, listUri],
    {
      getItemKey: (post: any) =>
        post.uri,
    }
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification de votre session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar
        handle={handle}
        onLogout={handleLogout}
      />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 px-4 py-3 backdrop-blur-md sm:px-5 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/feeds")}
              aria-label="Retour aux fils d’actualité"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl text-kelo-muted transition-colors hover:bg-kelo-background hover:text-kelo-text"
            >
              ←
            </button>

            {list?.avatar ? (
              <img
                src={list.avatar}
                alt={`Avatar de ${list.name || "la liste"}`}
                className="h-10 w-10 flex-shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient text-sm font-bold text-white">
                {(list?.name || "K")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-grow">
              <h1 className="truncate text-lg font-extrabold text-kelo-text sm:text-xl">
                {list?.name || "Liste"}
              </h1>

              {list?.listItemCount != null && (
                <p className="truncate text-xs text-kelo-muted">
                  {list.listItemCount} membre
                  {list.listItemCount > 1
                    ? "s"
                    : ""}
                </p>
              )}
            </div>
          </div>

          {list?.description && (
            <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
              {list.description}
            </p>
          )}
        </header>

        <div className="divide-y divide-kelo-border">
          {posts.map(
            (post: any, index: number) => (
              <PostCard
                key={post.uri || index}
                post={post}
                isBookmarked={isBookmarked(
                  post.uri
                )}
                onBookmark={() =>
                  toggleBookmark(post)
                }
              />
            )
          )}

          {!loading &&
            !error &&
            !listError &&
            posts.length === 0 && (
              <p className="py-10 text-center text-sm text-kelo-muted">
                Aucune publication pour cette liste.
              </p>
            )}

          {listError && (
            <p className="py-6 text-center text-sm text-kelo-danger">
              {listError}
            </p>
          )}

          {error && (
            <p className="py-6 text-center text-sm text-kelo-danger">
              {error}
            </p>
          )}

          {loading && (
            <div className="flex justify-center py-10">
              <img
                src="https://kelosocial.sirv.com/logo.png"
                alt="Chargement"
                className="h-10 w-10 animate-spin object-contain"
              />
            </div>
          )}

          <InfiniteScrollSentinel
            onIntersect={loadMore}
            disabled={
              loadingMore || !hasMore
            }
          />
        </div>
      </main>
    </div>
  );
}

export default function ListViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
          <img
            src="https://kelosocial.sirv.com/logo.png"
            alt="Chargement"
            className="h-10 w-10 animate-spin object-contain"
          />
        </div>
      }
    >
      <ListViewContent />
    </Suspense>
  );
}
