"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import Composer from "@/components/feed/Composer";
import PostCard from "@/components/feed/PostCard";
import FeedsRail from "@/components/feed/FeedsRail";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getDiscoverFeed } from "@/lib/atproto/feed";
import { getFollowingTimeline } from "@/lib/atproto/timeline";
import { createPost, deleteOwnPost } from "@/lib/atproto/posts";
import { getStoredSession } from "@/services/auth.service";
import {
  searchNetworkPosts,
  searchNetworkActors,
} from "@/lib/atproto/search";

type Tab = "pourvous" | "decouvrir";

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
      item.reason?.$type === "app.bsky.feed.defs#reasonRepost"
        ? item.reason.by
        : null,
  }));
}

function formatSearchPosts(results: any[]) {
  return results.map((post: any) => ({
    uri: post.uri,
    cid: post.cid,
    author: post.author,
    record: post.record,
    embed: post.embed,
    likeCount: post.likeCount || 0,
    repostCount: post.repostCount || 0,
    replyCount: post.replyCount || 0,
    viewer: post.viewer || {},
  }));
}

export default function FeedPage() {
  const { checked, handle } = useRequireAuth();
  const [myDid, setMyDid] = useState<string | null>(null);
  const [postText, setPostText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPosts, setSearchPosts] = useState<any[] | null>(null);
  const [searchProfiles, setSearchProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("pourvous");
  const [loadingPost, setLoadingPost] = useState(false);
  const [activeReplyUri, setActiveReplyUri] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    if (!checked) return;

    const session = getStoredSession();

    if (session) {
      setMyDid(session.did);
    }
  }, [checked]);

  const fetchFeedPage = useCallback(
    async (cursor?: string) => {
      if (!checked) {
        return { items: [], cursor: undefined };
      }

      if (activeTab === "decouvrir") {
        const { items, cursor: nextCursor } = await getDiscoverFeed(25, cursor);

        return {
          items: formatFeed(items),
          cursor: nextCursor,
        };
      }

      const { items, cursor: nextCursor } = await getFollowingTimeline(
        25,
        cursor
      );

      return {
        items: formatFeed(items),
        cursor: nextCursor,
      };
    },
    [activeTab, checked]
  );

  const {
    items: posts,
    setItems: setPosts,
    loading,
    loadingMore,
    hasMore,
    error: feedError,
    loadMore,
  } = useInfiniteFeed(fetchFeedPage, [activeTab, checked]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (trimmed.length < 2) {
      setSearchPosts(null);
      setSearchProfiles([]);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);

    const timeout = setTimeout(async () => {
      try {
        const [foundPosts, foundActors] = await Promise.all([
          searchNetworkPosts(trimmed),
          searchNetworkActors(trimmed),
        ]);

        setSearchPosts(formatSearchPosts(foundPosts));
        setSearchProfiles(foundActors);
      } catch (err) {
        console.error("Erreur de recherche :", err);
        setSearchError(
          "La recherche a échoué. Réessayez dans un instant."
        );
        setSearchPosts([]);
        setSearchProfiles([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleCreatePost = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!postText.trim()) {
      return;
    }

    setLoadingPost(true);

    try {
      const created = await createPost(postText);

      const newPostItem = {
        uri: created.uri,
        cid: created.cid,
        author: {
          handle,
          displayName: handle,
          did: myDid,
        },
        record: {
          text: created.text,
          facets: created.facets,
          createdAt: new Date().toISOString(),
        },
        likeCount: 0,
        repostCount: 0,
        replyCount: 0,
        viewer: {},
      };

      setPosts((previousPosts) => [newPostItem, ...previousPosts]);
      setPostText("");
    } catch (err) {
      console.error("Erreur lors de la publication", err);
      alert("Erreur lors de la publication sur le PDS.");
    } finally {
      setLoadingPost(false);
    }
  };

  const handleDeletePost = async (uri: string) => {
    if (!confirm("Supprimer définitivement cette publication ?")) {
      return;
    }

    try {
      await deleteOwnPost(uri);
      setPosts((previousPosts) =>
        previousPosts.filter((post) => post.uri !== uri)
      );

      if (searchPosts) {
        setSearchPosts((previousPosts) =>
          previousPosts
            ? previousPosts.filter((post) => post.uri !== uri)
            : previousPosts
        );
      }
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      alert("Impossible de supprimer cette publication.");
    }
  };


  const removeAuthorPosts = (authorDid?: string) => {
    if (!authorDid) {
      return;
    }

    setPosts((previousPosts) =>
      previousPosts.filter((post) => post.author?.did !== authorDid)
    );

    if (searchPosts) {
      setSearchPosts((previousPosts) =>
        previousPosts
          ? previousPosts.filter(
              (post) => post.author?.did !== authorDid
            )
          : previousPosts
      );
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

  const isSearching = searchQuery.trim().length >= 2;
  const displayedPosts = isSearching ? searchPosts ?? [] : posts;

  return (
    <div className="min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <div className="flex min-h-screen w-full">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 backdrop-blur-md">
            <div className="p-4">
              <h2 className="text-xl font-extrabold text-kelo-text">
                {isSearching
                  ? `Résultats pour « ${searchQuery} »`
                  : "Fil Fédéré Global"}
              </h2>
            </div>

            {!isSearching && (
              <div className="flex w-full border-t border-kelo-border text-sm">
                {(
                  [
                    ["pourvous", "🔥 Pour vous"],
                    ["decouvrir", "✨ Découvrir"],
                  ] as [Tab, string][]
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-center font-bold transition-colors ${
                      activeTab === tab
                        ? "border-b-4 border-kelo-primary text-kelo-text"
                        : "text-kelo-muted hover:bg-kelo-background"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isSearching && (
            <Composer
              handle={handle}
              value={postText}
              onChange={setPostText}
              onSubmit={handleCreatePost}
              loading={loadingPost}
            />
          )}

          <div className="divide-y divide-kelo-border">
            {searching && isSearching && (
              <p className="py-6 text-center text-sm text-kelo-muted">
                Recherche en cours...
              </p>
            )}

            {!searching && searchError && (
              <p className="py-6 text-center text-sm text-kelo-danger">
                {searchError}
              </p>
            )}

            {!isSearching && !loading && feedError && (
              <p className="py-6 text-center text-sm text-kelo-danger">
                {feedError}
              </p>
            )}

            {!searching &&
              !searchError &&
              displayedPosts.map((post: any, index: number) => {
                const isMine = !!myDid && post.author?.did === myDid;

                return (
                  <PostCard
                    key={post.uri || index}
                    post={post}
                    isMine={isMine}
                    isBookmarked={isBookmarked(post.uri)}
                    replyOpen={activeReplyUri === post.uri}
                    replyText={replyText}
                    onToggleReply={() =>
                      setActiveReplyUri(
                        activeReplyUri === post.uri ? null : post.uri
                      )
                    }
                    onReplyTextChange={setReplyText}
                    onSendReply={() => {
                      alert("Commentaire publié !");
                      setReplyText("");
                      setActiveReplyUri(null);
                    }}
                    onBookmark={() => toggleBookmark(post)}
                    onDelete={() => handleDeletePost(post.uri)}
                    onBlocked={() =>
                      removeAuthorPosts(post.author?.did)
                    }
                    onMuted={() =>
                      removeAuthorPosts(post.author?.did)
                    }
                  />
                );
              })}

            {!isSearching &&
              !loading &&
              !feedError &&
              displayedPosts.length === 0 && (
                <p className="py-10 text-center text-sm text-kelo-muted">
                  Aucune publication pour l&apos;instant.
                </p>
              )}

            {isSearching &&
              !searching &&
              !searchError &&
              displayedPosts.length === 0 && (
                <p className="py-10 text-center text-sm text-kelo-muted">
                  Aucun résultat trouvé.
                </p>
              )}

            {!isSearching && loading && (
              <div className="flex justify-center py-10">
                <div className="h-12 w-12 animate-spin">
                  <img
                    src="https://kelosocial.sirv.com/logo.png"
                    alt="Chargement"
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            )}

            {!isSearching && (
              <InfiniteScrollSentinel
                onIntersect={loadMore}
                disabled={loadingMore || !hasMore}
              />
            )}
          </div>
        </main>

        <aside className="sticky top-0 hidden h-screen flex-shrink-0 border-r border-kelo-border bg-white p-4 xl:block xl:w-[300px] 2xl:w-[360px] 2xl:p-6">
          <div className="relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="🔍 Chercher @user ou mot-clé..."
              className="w-full rounded-full bg-kelo-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
            />
          </div>

          {isSearching && searchProfiles.length > 0 ? (
            <div className="rounded-2xl border border-kelo-border bg-kelo-background p-4">
              <h3 className="mb-3 text-sm font-bold text-kelo-text">
                Comptes trouvés
              </h3>

              <div className="flex flex-col gap-3">
                {searchProfiles.map((actor: any) => (
                  <Link
                    key={actor.did}
                    href={`/profile/${actor.handle}`}
                    className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-white"
                  >
                    <Avatar
                      src={actor.avatar}
                      fallback={actor.handle[0].toUpperCase()}
                      size="sm"
                    />

                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="max-w-full truncate text-sm font-bold text-kelo-text">
                          {actor.displayName || actor.handle}
                        </p>

                        <AccountBadges
                          actor={actor}
                          identitySize="sm"
                          certificationSize={15}
                          gap="xs"
                        />
                      </div>

                      <p className="truncate text-xs text-kelo-muted">
                        @{actor.handle}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <FeedsRail />
          )}
        </aside>
      </div>
    </div>
  );
}
