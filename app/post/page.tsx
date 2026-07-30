"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useCertifications } from "@/hooks/useCertifications";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getPostThread } from "@/lib/atproto/post-thread";
import { deleteOwnPost } from "@/lib/atproto/posts";
import { getStoredSession } from "@/services/auth.service";

function flattenPost(view: any) {
  return {
    uri: view.uri,
    cid: view.cid,
    author: view.author,
    record: view.record,
    embed: view.embed,
    likeCount: view.likeCount || 0,
    repostCount: view.repostCount || 0,
    replyCount: view.replyCount || 0,
    viewer: view.viewer || {},
  };
}

function PostThreadContent() {
  const { checked, handle } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const uri = searchParams.get("uri") || "";

  const [myDid, setMyDid] = useState<string | null>(null);
  const [rootPost, setRootPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReplyUri, setActiveReplyUri] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const { getStatus } = useCertifications();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    if (!checked || !uri) return;
    const session = getStoredSession();
    if (session) setMyDid(session.did);

    getPostThread(uri)
      .then((thread: any) => {
        if (thread?.post) {
          setRootPost(flattenPost(thread.post));
          setReplies((thread.replies || []).map((r: any) => flattenPost(r.post)));
        } else {
          setError("Cette publication est introuvable ou a été supprimée.");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger cette publication.");
      })
      .finally(() => setLoading(false));
  }, [checked, uri]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleDelete = async (postUri: string) => {
    if (!confirm("Supprimer définitivement cette publication ?")) return;
    try {
      await deleteOwnPost(postUri);
      router.push("/feed");
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
    <div className="flex min-h-screen justify-center bg-kelo-background font-sans text-kelo-text">
      <div className="flex w-full max-w-7xl">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-kelo-border bg-white/90 p-4 backdrop-blur-md">
            <button onClick={() => router.back()} className="text-kelo-muted transition-colors hover:text-kelo-text">
              ←
            </button>
            <h2 className="text-lg font-extrabold text-kelo-text">Publication</h2>
          </div>

          {loading && <p className="py-10 text-center text-sm text-kelo-muted">Chargement...</p>}
          {error && <p className="py-10 text-center text-sm text-kelo-danger">{error}</p>}

          {!loading && !error && rootPost && (
            <div className="divide-y divide-kelo-border">
              <PostCard
                post={rootPost}
                badgeStatus={getStatus(rootPost.author?.handle)}
                isMine={!!myDid && rootPost.author?.did === myDid}
                isBookmarked={isBookmarked(rootPost.uri)}
                replyOpen={activeReplyUri === rootPost.uri}
                replyText={replyText}
                onToggleReply={() => setActiveReplyUri(activeReplyUri === rootPost.uri ? null : rootPost.uri)}
                onReplyTextChange={setReplyText}
                onSendReply={() => {
                  alert("Commentaire publié !");
                  setReplyText("");
                  setActiveReplyUri(null);
                }}
                onBookmark={() => toggleBookmark(rootPost)}
                onDelete={() => handleDelete(rootPost.uri)}
              />

              {replies.map((reply) => (
                <PostCard
                  key={reply.uri}
                  post={reply}
                  badgeStatus={getStatus(reply.author?.handle)}
                  isMine={!!myDid && reply.author?.did === myDid}
                  isBookmarked={isBookmarked(reply.uri)}
                  onBookmark={() => toggleBookmark(reply)}
                  onDelete={() => handleDelete(reply.uri)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function PostThreadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
          Chargement...
        </div>
      }
    >
      <PostThreadContent />
    </Suspense>
  );
}
