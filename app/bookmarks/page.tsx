"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useCertifications } from "@/hooks/useCertifications";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getStoredSession } from "@/services/auth.service";
import { deleteOwnPost } from "@/lib/atproto/posts";

export default function BookmarksPage() {
  const { checked, handle } = useRequireAuth();
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();
  const { getStatus } = useCertifications();
  const [myDid, setMyDid] = useState<string | null>(null);

  useEffect(() => {
    if (!checked) return;
    const session = getStoredSession();
    if (session) setMyDid(session.did);
  }, [checked]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleDelete = async (uri: string) => {
    if (!confirm("Supprimer définitivement cette publication ?")) return;
    try {
      await deleteOwnPost(uri);
    } catch (err) {
      console.error(err);
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

        <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 p-4 backdrop-blur-md">
            <h2 className="text-xl font-extrabold text-kelo-text">Conservés</h2>
          </div>

          <div className="divide-y divide-kelo-border">
            {bookmarks.length > 0 ? (
              bookmarks.map((post: any) => (
                <PostCard
                  key={post.uri}
                  post={post}
                  badgeStatus={getStatus(post.author?.handle)}
                  isMine={!!myDid && post.author?.did === myDid}
                  isBookmarked={isBookmarked(post.uri)}
                  onBookmark={() => toggleBookmark(post)}
                  onDelete={() => handleDelete(post.uri)}
                />
              ))
            ) : (
              <p className="py-10 text-center text-sm text-kelo-muted">Aucune publication conservée pour l'instant.</p>
            )}
          </div>
        </main>
    </div>
  );
}
