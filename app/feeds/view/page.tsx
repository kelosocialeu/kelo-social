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
import { Pin } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useBookmarks } from "@/hooks/useBookmarks";

import {
  getFeedPosts,
  getFeedGenerators,
  saveFeed,
  togglePinFeed,
  getSavedFeedItems,
} from "@/lib/atproto/feeds";

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

function FeedViewContent() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const feedUri = searchParams.get("uri") || "";

  const [generator, setGenerator] =
    useState<any>(null);

  const [isSaved, setIsSaved] =
    useState(false);

  const [pinned, setPinned] =
    useState(false);

  const [pinLoading, setPinLoading] =
    useState(false);

  const {
    isBookmarked,
    toggleBookmark,
  } = useBookmarks();

  useEffect(() => {
    if (!checked || !feedUri) {
      return;
    }

    getFeedGenerators([feedUri])
      .then((feeds) => {
        setGenerator(feeds[0] || null);
      })
      .catch((error) => {
        console.error(
          "Impossible de charger le fil :",
          error
        );
      });

    getSavedFeedItems()
      .then((items) => {
        const item = items.find(
          (savedItem) =>
            savedItem.value === feedUri
        );

        setIsSaved(!!item);
        setPinned(!!item?.pinned);
      })
      .catch((error) => {
        console.error(
          "Impossible de charger les fils enregistrés :",
          error
        );
      });
  }, [checked, feedUri]);

  const fetcher = useCallback(
    async (cursor?: string) => {
      if (!checked || !feedUri) {
        return {
          items: [],
          cursor: undefined,
        };
      }

      const {
        items,
        cursor: nextCursor,
      } = await getFeedPosts(
        feedUri,
        25,
        cursor
      );

      return {
        items: formatFeed(items),
        cursor: nextCursor,
      };
    },
    [checked, feedUri]
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
    [checked, feedUri],
    {
      getItemKey: (post: any) =>
        post.uri,
    }
  );

  const handlePinToggle = async () => {
    if (!feedUri || pinLoading) {
      return;
    }

    setPinLoading(true);

    try {
      if (!isSaved) {
        await saveFeed(feedUri);
        setIsSaved(true);
      }

      await togglePinFeed(feedUri);

      setPinned((previous) => !previous);
    } catch (error) {
      console.error(
        "Impossible de modifier l’épinglage :",
        error
      );

      alert(
        "Action impossible pour le moment."
      );
    } finally {
      setPinLoading(false);
    }
  };

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
              onClick={() =>
                router.push("/feeds")
              }
              aria-label="Retour aux fils d’actualité"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl text-kelo-muted transition-colors hover:bg-kelo-background hover:text-kelo-text"
            >
              ←
            </button>

            <div className="min-w-0 flex-grow">
              <h1 className="truncate text-lg font-extrabold text-kelo-text sm:text-xl">
                {generator?.displayName ||
                  "Fil d'actu"}
              </h1>

              {generator?.creator?.handle && (
                <p className="truncate text-xs text-kelo-muted">
                  par @
                  {generator.creator.handle}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handlePinToggle}
              disabled={pinLoading}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                pinned
                  ? "bg-kelo-gradient text-white"
                  : "bg-kelo-background text-kelo-muted hover:text-kelo-primary"
              }`}
              title={
                pinned
                  ? "Désépingler"
                  : "Épingler à mes fils"
              }
              aria-label={
                pinned
                  ? "Désépingler ce fil"
                  : "Épingler ce fil"
              }
            >
              <Pin
                className="h-4 w-4"
                fill={
                  pinned
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
          </div>

          {generator?.description && (
            <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
              {generator.description}
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
            posts.length === 0 && (
              <p className="py-10 text-center text-sm text-kelo-muted">
                Aucune publication dans ce fil.
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

export default function FeedViewPage() {
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
      <FeedViewContent />
    </Suspense>
  );
}
