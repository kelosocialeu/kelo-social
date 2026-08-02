"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getListInfo, getListFeedPosts } from "@/lib/atproto/lists";

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

function ListViewContent() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listUri = searchParams.get("uri") || "";

  const [list, setList] = useState<any>(null);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    if (!checked || !listUri) return;
    getListInfo(listUri)
      .then(setList)
      .catch((err) => console.error(err));
  }, [checked, listUri]);

  const fetcher = useCallback(
    async (cursor?: string) => {
      if (!checked || !listUri) return { items: [], cursor: undefined };
      const { items, cursor: nextCursor } = await getListFeedPosts(listUri, 25, cursor);
      return { items: formatFeed(items), cursor: nextCursor };
    },
    [checked, listUri]
  );

  const { items: posts, loading, hasMore, error, loadMore } = useInfiniteFeed(fetcher, [checked, listUri]);

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
            {list?.avatar ? (
              <img src={list.avatar} alt="" className="h-9 w-9 flex-shrink-0 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient text-sm font-bold text-white">
                K
              </div>
            )}
            <div className="min-w-0 flex-grow">
              <h2 className="truncate text-lg font-extrabold text-kelo-text">{list?.name || "Liste"}</h2>
              {list?.listItemCount != null && (
                <p className="truncate text-xs text-kelo-muted">{list.listItemCount} membres</p>
              )}
            </div>
          </div>
          {list?.description && <p className="mt-2 text-sm text-kelo-muted">{list.description}</p>}
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
            <p className="py-10 text-center text-sm text-kelo-muted">Aucune publication pour cette liste.</p>
          )}
          {error && <p className="py-6 text-center text-sm text-kelo-danger">{error}</p>}
          {loading && <p className="py-6 text-center text-sm text-kelo-muted">Chargement...</p>}

          <InfiniteScrollSentinel onIntersect={loadMore} disabled={loading || !hasMore} />
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
          Chargement...
        </div>
      }
    >
      <ListViewContent />
    </Suspense>
  );
}
