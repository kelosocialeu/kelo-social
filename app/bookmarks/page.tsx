"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getStoredSession } from "@/services/auth.service";
import { deleteOwnPost } from "@/lib/atproto/posts";

export default function BookmarksPage() {
  const { checked, handle } = useRequireAuth();
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();
  const [myDid, setMyDid] = useState<string | null>(null);

  useEffect(() => {
    if (!checked) {
      return;
    }

    const session = getStoredSession();

    if (session) {
      setMyDid(session.did);
    }
  }, [checked]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleDelete = async (uri: string) => {
    if (!confirm("Supprimer définitivement cette publication ?")) {
      return;
    }

    try {
      await deleteOwnPost(uri);
    } catch (error) {
      console.error(error);
      alert("Impossible de supprimer cette publication.");
    }
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

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5 lg:px-6">
            <div>
              <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">
                Conservés
              </h1>

              <p className="mt-1 text-xs text-kelo-muted sm:text-sm">
                Retrouvez les publications que vous avez enregistrées.
              </p>
            </div>

            {bookmarks.length > 0 && (
              <span className="rounded-full bg-kelo-background px-3 py-1 text-xs font-semibold text-kelo-muted">
                {bookmarks.length} publication
                {bookmarks.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </header>

        <div className="divide-y divide-kelo-border">
          {bookmarks.length > 0 ? (
            bookmarks.map((post: any) => (
              <PostCard
                key={post.uri}
                post={post}
                isMine={!!myDid && post.author?.did === myDid}
                isBookmarked={isBookmarked(post.uri)}
                onBookmark={() => toggleBookmark(post)}
                onDelete={() => handleDelete(post.uri)}
              />
            ))
          ) : (
            <div className="flex min-h-[calc(100vh-100px)] items-start justify-center px-6 py-12 sm:items-center">
              <div className="max-w-md text-center">
                <div className="text-4xl" aria-hidden="true">
                  🔖
                </div>

                <h2 className="mt-4 text-lg font-bold text-kelo-text">
                  Aucune publication conservée
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
                  Utilisez l’icône de conservation sous une publication
                  pour la retrouver ici plus tard.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
