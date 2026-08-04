"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import VerificationBadge from "@/components/ui/VerificationBadge";
import PostCard from "@/components/feed/PostCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getStoredSession } from "@/services/auth.service";
import {
  searchNetworkPosts,
  searchNetworkActors,
} from "@/lib/atproto/search";

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

function SearchContent() {
  const searchParams = useSearchParams();
  const { checked, handle } = useRequireAuth();
  const [myDid, setMyDid] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [tab, setTab] = useState<"posts" | "accounts">("posts");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [actors, setActors] = useState<any[]>([]);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    if (!checked) return;

    const session = getStoredSession();

    if (session) {
      setMyDid(session.did);
    }
  }, [checked]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setPosts([]);
      setActors([]);
      setError(null);
      return;
    }

    setSearching(true);
    setError(null);

    const timeout = setTimeout(async () => {
      try {
        const [foundPosts, foundActors] = await Promise.all([
          searchNetworkPosts(trimmed, 25),
          searchNetworkActors(trimmed, 20),
        ]);

        setPosts(formatSearchPosts(foundPosts));
        setActors(foundActors);
      } catch (err) {
        console.error(err);
        setError("La recherche a échoué. Réessayez dans un instant.");
        setPosts([]);
        setActors([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleLike = (uri: string) => {
    setPosts((previousPosts) =>
      previousPosts.map((post) => {
        if (post.uri !== uri) {
          return post;
        }

        const liked = post.viewer?.like;

        return {
          ...post,
          viewer: {
            ...post.viewer,
            like: !liked,
          },
          likeCount: liked
            ? post.likeCount - 1
            : post.likeCount + 1,
        };
      })
    );
  };

  const handleRepost = (uri: string) => {
    setPosts((previousPosts) =>
      previousPosts.map((post) => {
        if (post.uri !== uri) {
          return post;
        }

        const reposted = post.viewer?.repost;

        return {
          ...post,
          viewer: {
            ...post.viewer,
            repost: !reposted,
          },
          repostCount: reposted
            ? post.repostCount - 1
            : post.repostCount + 1,
        };
      })
    );
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

  const hasQuery = query.trim().length >= 2;

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 backdrop-blur-md">
          <div className="p-3 sm:p-4 lg:p-5">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="🔍 Chercher @user ou mot-clé sur tout le réseau fédéré..."
              autoFocus
              className="w-full rounded-full bg-kelo-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary sm:px-5"
            />
          </div>

          {hasQuery && (
            <div className="flex w-full border-t border-kelo-border text-sm">
              {(
                [
                  [
                    "posts",
                    `Publications${posts.length ? ` (${posts.length})` : ""}`,
                  ],
                  [
                    "accounts",
                    `Comptes${actors.length ? ` (${actors.length})` : ""}`,
                  ],
                ] as [typeof tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 py-3 text-center font-bold transition-colors ${
                    tab === key
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

        {!hasQuery && (
          <div className="flex min-h-[calc(100vh-90px)] items-start justify-center px-6 py-10 sm:items-center">
            <div className="max-w-xl text-center">
              <p className="text-sm text-kelo-muted sm:text-base">
                Cherchez un mot-clé ou un handle pour explorer tout le réseau
                fédéré.
              </p>
            </div>
          </div>
        )}

        {hasQuery && searching && (
          <p className="py-10 text-center text-sm text-kelo-muted">
            Recherche en cours...
          </p>
        )}

        {hasQuery && !searching && error && (
          <p className="py-10 text-center text-sm text-kelo-danger">
            {error}
          </p>
        )}

        {hasQuery && !searching && !error && tab === "posts" && (
          <div className="divide-y divide-kelo-border">
            {posts.length > 0 ? (
              posts.map((post: any) => (
                <PostCard
                  key={post.uri}
                  post={post}
                  isMine={!!myDid && post.author?.did === myDid}
                  isBookmarked={isBookmarked(post.uri)}
                  onLike={() => handleLike(post.uri)}
                  onRepost={() => handleRepost(post.uri)}
                  onBookmark={() => toggleBookmark(post)}
                />
              ))
            ) : (
              <p className="py-10 text-center text-sm text-kelo-muted">
                Aucune publication trouvée.
              </p>
            )}
          </div>
        )}

        {hasQuery && !searching && !error && tab === "accounts" && (
          <div className="divide-y divide-kelo-border">
            {actors.length > 0 ? (
              actors.map((actor: any) => (
                <Link
                  key={actor.did}
                  href={`/profile/${actor.handle}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-kelo-background/60 sm:px-5 lg:px-6"
                >
                  <Avatar
                    src={actor.avatar}
                    fallback={actor.handle[0].toUpperCase()}
                  />

                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-kelo-text">
                        {actor.displayName || actor.handle}
                      </p>

                      <VerificationBadge actor={actor} />
                    </div>

                    <p className="truncate text-xs text-kelo-muted">
                      @{actor.handle}
                    </p>

                    {actor.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-kelo-muted">
                        {actor.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-kelo-muted">
                Aucun compte trouvé.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
          Chargement...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
