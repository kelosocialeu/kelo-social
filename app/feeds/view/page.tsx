"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Pin } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getFeedPosts, getFeedGenerators, saveFeed, togglePinFeed, getSavedFeedItems } from "@/lib/atproto/feeds";

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
    repostedBy: item.reason?.$type === "app.bsky.feed.defs#reasonRepost" ? item.reason.by : null,
  }));
}

function FeedViewContent() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedUri = searchParams.get("uri") || "";

  const [generator, setGenerator] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    if (!checked || !feedUri) return;
    getFeedGenerators([feedUri])
      .then((feeds) => setGenerator(feeds[0] || null))
      .catch((err) => console.error(err));
    getSavedFeedItems()
      .then((items) => {
        const item = items.find((i) => i.value === feedUri);
        setIsSaved(!!item);
        setPinned(!!item?.pinned);
      })
      .catch((err) => console.error(err));
  }, [checked, feedUri]);

  const fetcher = useCallback(
    async (cursor?: string) => {
      if (!checked || !feedUri) return { items: [], cursor: undefined };
      const { items, cursor: nextCursor } = await getFeedPosts(feedUri, 25, cursor);
      return { items: formatFeed(items), cursor: nextCursor };
    },
    [checked, feedUri]
  );

  const { items: posts, loading, hasMore, error, loadMore } = useInfiniteFeed(fetcher, [checked, feedUri]);

  const handlePinToggle = async () => {
    setPinLoading(true);
    try {
      if (!isSaved) {
        await saveFeed(feedUri);
        setIsSaved(true);
      }
      await togglePinFeed(feedUri);
      setPinned((prev) => !prev);
    } catch (err) {
      console.error(err);
      alert("Action impossible pour le moment.");
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
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
        <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/feeds")} className="text-kelo-muted transition-colors hover:text-kelo-text">
              ←
            </button>
            <div className="min-w-0 flex-grow">
              <h2 className="truncate text-lg font-extrabold text-kelo-text">
                {generator?.displayName || "Fil d'actu"}
              </h2>
              {generator?.creator?.handle && (
                <p className="truncate text-xs text-kelo-muted">par @{generator.creator.handle}</p>
              )}
            </div>
            <button
              onClick={handlePinToggle}
              disabled={pinLoading}
              className={`flex-shrink-0 rounded-full p-2.5 transition-colors ${
                pinned ? "bg-kelo-gradient text-white" : "bg-kelo-background text-kelo-muted hover:text-kelo-primary"
              }`}
              title={pinned ? "Désépingler" : "Épingler à mes fils"}
            >
              <Pin className="h-4 w-4" fill={pinned ? "currentColor" : "none"} />
            </button>
          </div>
          {generator?.description && (
            <p className="mt-2 text-sm text-kelo-muted">{generator.description}</p>
          )}
        </div>

        <div className="divide-y divide-kelo-border">
          {posts.map((post: any, idx: number) => (
            <PostCard
              key={post.uri || idx}
              post={post}
              isBookmarked={isBookmarked(post.uri)}
              onBookmark={() => toggleBookmark(post)}
            />
          ))}

          {!loading && !error && posts.length === 0 && (
            <p className="py-10 text-center text-sm text-kelo-muted">Aucune publication dans ce fil.</p>
          )}
          {error && <p className="py-6 text-center text-sm text-kelo-danger">{error}</p>}
          {loading && <p className="py-6 text-center text-sm text-kelo-muted">Chargement...</p>}

          <InfiniteScrollSentinel onIntersect={loadMore} disabled={loading || !hasMore} />
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
          Chargement...
        </div>
      }
    >
      <FeedViewContent />
    </Suspense>
  );
}
