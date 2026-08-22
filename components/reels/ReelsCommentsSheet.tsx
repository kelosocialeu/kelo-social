"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Loader2, Send, X } from "lucide-react";

import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import { getPostThread } from "@/lib/atproto/post-thread";
import { likePost, unlikePost, replyToPost } from "@/lib/atproto/posts";

type StrongRef = { uri: string; cid: string };

type CommentRow = {
  post: any;
  depth: number;
};

interface ReelsCommentsSheetProps {
  open: boolean;
  post: any;
  onClose: () => void;
  onReplyAdded?: () => void;
}

function isThreadNode(value: any) {
  return Boolean(value?.post?.uri && value?.post?.cid);
}

function flattenReplies(replies: any[] = [], depth = 0): CommentRow[] {
  const result: CommentRow[] = [];
  for (const reply of replies) {
    if (!isThreadNode(reply)) continue;
    result.push({ post: reply.post, depth });
    if (Array.isArray(reply.replies)) {
      result.push(...flattenReplies(reply.replies, depth + 1));
    }
  }
  return result;
}

function timeAgo(value?: string) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

export default function ReelsCommentsSheet({ open, post, onClose, onReplyAdded }: ReelsCommentsSheetProps) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState<any>(null);
  const [busyLike, setBusyLike] = useState<string | null>(null);

  const rootRef = useMemo<StrongRef>(() => ({ uri: post.uri, cid: post.cid }), [post.uri, post.cid]);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const thread: any = await getPostThread(post.uri, { depth: 6, parentHeight: 0 });
      if (!isThreadNode(thread)) {
        setComments([]);
        return;
      }
      setComments(flattenReplies(Array.isArray(thread.replies) ? thread.replies : []));
    } catch (err) {
      console.error("Impossible de charger les commentaires du Réel", err);
      setError("Impossible de charger les commentaires.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadComments();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, post.uri]);

  const sendComment = async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    setError(null);
    try {
      const target = replyTarget
        ? { uri: replyTarget.uri, cid: replyTarget.cid, root: rootRef }
        : rootRef;
      await replyToPost(clean, target);
      setText("");
      setReplyTarget(null);
      onReplyAdded?.();
      await loadComments();
    } catch (err) {
      console.error("Impossible de publier le commentaire du Réel", err);
      setError("Impossible de publier ce commentaire.");
    } finally {
      setSending(false);
    }
  };

  const toggleCommentLike = async (comment: any) => {
    if (busyLike) return;
    setBusyLike(comment.uri);
    try {
      if (comment.viewer?.like) {
        await unlikePost(comment.viewer.like);
        setComments((current) => current.map((row) => row.post.uri === comment.uri ? {
          ...row,
          post: {
            ...row.post,
            likeCount: Math.max(0, (row.post.likeCount || 0) - 1),
            viewer: { ...row.post.viewer, like: undefined },
          },
        } : row));
      } else {
        const likeUri = await likePost({ uri: comment.uri, cid: comment.cid });
        setComments((current) => current.map((row) => row.post.uri === comment.uri ? {
          ...row,
          post: {
            ...row.post,
            likeCount: (row.post.likeCount || 0) + 1,
            viewer: { ...row.post.viewer, like: likeUri },
          },
        } : row));
      }
    } catch (err) {
      console.error("Impossible de liker ce commentaire", err);
    } finally {
      setBusyLike(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 md:items-center md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="flex h-[72dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white text-slate-950 shadow-2xl md:h-[78vh] md:rounded-[28px]" role="dialog" aria-modal="true" aria-label="Commentaires du Réel">
        <header className="relative flex flex-shrink-0 items-center justify-center border-b border-slate-100 px-5 py-4">
          <div className="absolute top-2 h-1.5 w-10 rounded-full bg-slate-300 md:hidden" />
          <h2 className="pt-1 text-base font-extrabold">{post.replyCount || comments.length} commentaire{(post.replyCount || comments.length) > 1 ? "s" : ""}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer les commentaires" className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"><X className="h-6 w-6" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {loading && <div className="flex h-36 items-center justify-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {!loading && error && <div className="py-5 text-center text-sm text-red-500">{error}</div>}
          {!loading && !error && comments.length === 0 && <div className="flex h-40 flex-col items-center justify-center text-center"><p className="font-bold">Aucun commentaire</p><p className="mt-1 text-sm text-slate-500">Soyez la première personne à commenter.</p></div>}

          {!loading && comments.map(({ post: comment, depth }) => {
            const recordText = typeof comment.record?.text === "string" ? comment.record.text : "";
            return (
              <article key={comment.uri} className="mb-5 flex gap-3" style={{ marginLeft: `${Math.min(depth, 2) * 24}px` }}>
                <Avatar src={comment.author?.avatar} fallback={(comment.author?.handle || "K")[0].toUpperCase()} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600">
                    <span className="truncate">{comment.author?.displayName || comment.author?.handle}</span>
                    <AccountBadges actor={comment.author} identitySize="sm" certificationSize={14} gap="xs" />
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-5 text-slate-950">{recordText}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs font-semibold text-slate-400">
                    <span>{timeAgo(comment.record?.createdAt)}</span>
                    <button type="button" onClick={() => setReplyTarget(comment)} className="text-slate-500">Répondre</button>
                  </div>
                </div>
                <button type="button" onClick={() => toggleCommentLike(comment)} disabled={busyLike === comment.uri} className={`flex w-10 flex-shrink-0 flex-col items-center gap-1 pt-2 text-[11px] ${comment.viewer?.like ? "text-fuchsia-500" : "text-slate-400"}`} aria-label="Aimer ce commentaire">
                  <Heart className="h-5 w-5" fill={comment.viewer?.like ? "currentColor" : "none"} />
                  <span>{comment.likeCount || 0}</span>
                </button>
              </article>
            );
          })}
        </div>

        <footer className="flex-shrink-0 border-t border-slate-100 bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          {replyTarget && <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600"><span className="truncate">Réponse à @{replyTarget.author?.handle}</span><button type="button" onClick={() => setReplyTarget(null)} className="font-bold">Annuler</button></div>}
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 rounded-[24px] bg-slate-100 px-4 py-2.5">
              <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendComment(); } }} placeholder="Ajouter un commentaire…" rows={1} maxLength={300} className="max-h-24 min-h-[24px] w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-slate-400" />
            </div>
            <button type="button" onClick={() => void sendComment()} disabled={!text.trim() || sending} aria-label="Publier le commentaire" className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-kelo-gradient text-white shadow disabled:opacity-40">{sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
