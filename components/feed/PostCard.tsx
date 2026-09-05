"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Repeat2, Trash2, X } from "lucide-react";

import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import PostText from "@/components/feed/PostText";
import PostEmbed from "@/components/feed/PostEmbed";
import PostActions from "@/components/feed/PostActions";
import PostTranslation from "@/components/feed/PostTranslation";
import SensitiveContentGate from "@/components/feed/SensitiveContentGate";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import {
  likePost,
  unlikePost,
  repostPost,
  undoRepost,
  replyToPost,
  POST_CHARACTER_LIMIT,
} from "@/lib/atproto/posts";
import { editOwnPost } from "@/lib/atproto/edit-post";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";

interface PostCardProps {
  post: any;
  isMine?: boolean;
  isBookmarked?: boolean;
  replyOpen?: boolean;
  replyText?: string;
  onToggleReply?: () => void;
  onReplyTextChange?: (text: string) => void;
  onSendReply?: () => void;
  onLike?: () => void;
  onRepost?: () => void;
  onBookmark?: () => void;
  onDelete?: () => void;
  onBlocked?: () => void;
  onMuted?: () => void;
  disableThreadLink?: boolean;
}

function formatRelativeTime(value?: string) {
  if (!value) return "";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor(Math.max(0, Date.now() - t) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} j`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} sem`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} mois`;
  const y = Math.floor(d / 365);
  return `${y} an${y > 1 ? "s" : ""}`;
}

export default function PostCard({
  post,
  isMine,
  isBookmarked,
  replyOpen,
  replyText,
  onToggleReply,
  onReplyTextChange,
  onSendReply,
  onLike,
  onRepost,
  onBookmark,
  onDelete,
  onBlocked,
  onMuted,
  disableThreadLink,
}: PostCardProps) {
  const router = useRouter();
  const { dialogOpen, requireVerification, closeDialog } = useIdentityVerification();
  const handle = post.author?.handle;

  const [liked, setLiked] = useState(!!post.viewer?.like);
  const [likeUri, setLikeUri] = useState<string | null>(post.viewer?.like || null);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount || 0);
  const [reposted, setReposted] = useState(!!post.viewer?.repost);
  const [repostUri, setRepostUri] = useState<string | null>(post.viewer?.repost || null);
  const [localRepostCount, setLocalRepostCount] = useState(post.repostCount || 0);
  const [liking, setLiking] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [replying, setReplying] = useState(false);
  const [clock, setClock] = useState(0);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editText, setEditText] = useState(post.record?.text || "");
  const [localText, setLocalText] = useState(post.record?.text || "");
  const [localFacets, setLocalFacets] = useState(post.record?.facets);
  const [localCid, setLocalCid] = useState(post.cid);

  useEffect(() => {
    setLiked(!!post.viewer?.like);
    setLikeUri(post.viewer?.like || null);
    setLocalLikeCount(post.likeCount || 0);
  }, [post.viewer?.like, post.likeCount]);

  useEffect(() => {
    setReposted(!!post.viewer?.repost);
    setRepostUri(post.viewer?.repost || null);
    setLocalRepostCount(post.repostCount || 0);
  }, [post.viewer?.repost, post.repostCount]);

  useEffect(() => {
    setLocalText(post.record?.text || "");
    setLocalFacets(post.record?.facets);
    setLocalCid(post.cid);
    setEditText(post.record?.text || "");
  }, [post.uri, post.cid, post.record?.text, post.record?.facets]);

  useEffect(() => {
    const id = window.setInterval(() => setClock((value) => value + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const relativeTime = useMemo(
    () => formatRelativeTime(post.record?.createdAt || post.indexedAt),
    [post.record?.createdAt, post.indexedAt, clock]
  );

  const card = () => {
    if (!disableThreadLink && post.uri && !post.uri.startsWith("local-") && !editing && !menuOpen) {
      router.push(`/post?uri=${encodeURIComponent(post.uri)}`);
    }
  };

  const like = async () => {
    if (liking || !post.uri || !localCid) return;
    const wasLiked = liked;
    const previousUri = likeUri;
    const previousCount = localLikeCount;
    setLiking(true);
    setLiked(!wasLiked);
    setLocalLikeCount(wasLiked ? Math.max(0, previousCount - 1) : previousCount + 1);
    try {
      if (wasLiked) {
        if (!previousUri) throw Error();
        await unlikePost(previousUri);
        setLikeUri(null);
      } else {
        setLikeUri(await likePost({ uri: post.uri, cid: localCid }));
      }
      onLike?.();
    } catch {
      setLiked(wasLiked);
      setLikeUri(previousUri);
      setLocalLikeCount(previousCount);
    } finally {
      setLiking(false);
    }
  };

  const repost = async () => {
    if (reposting || !post.uri || !localCid) return;
    const wasReposted = reposted;
    const previousUri = repostUri;
    const previousCount = localRepostCount;
    setReposting(true);
    setReposted(!wasReposted);
    setLocalRepostCount(wasReposted ? Math.max(0, previousCount - 1) : previousCount + 1);
    try {
      if (wasReposted) {
        if (!previousUri) throw Error();
        await undoRepost(previousUri);
        setRepostUri(null);
      } else {
        setRepostUri(await repostPost({ uri: post.uri, cid: localCid }));
      }
      onRepost?.();
    } catch {
      setReposted(wasReposted);
      setRepostUri(previousUri);
      setLocalRepostCount(previousCount);
    } finally {
      setReposting(false);
    }
  };

  const reply = async () => {
    if (!requireVerification()) return;
    const text = replyText?.trim();
    if (replying || !text || !post.uri || !localCid) return;
    setReplying(true);
    try {
      const root = post.record?.reply?.root;
      await replyToPost(text, {
        uri: post.uri,
        cid: localCid,
        root: root?.uri && root?.cid ? { uri: root.uri, cid: root.cid } : undefined,
      });
      onReplyTextChange?.("");
      onSendReply?.();
    } finally {
      setReplying(false);
    }
  };

  const startEditing = () => {
    setMenuOpen(false);
    setEditError("");
    setEditText(localText);
    setEditing(true);
  };

  const cancelEditing = () => {
    if (savingEdit) return;
    setEditError("");
    setEditText(localText);
    setEditing(false);
  };

  const saveEdit = async () => {
    if (savingEdit || !post.uri) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const result = await editOwnPost(post.uri, post.record || {}, editText);
      setLocalText(result.text);
      setLocalFacets(result.facets);
      setLocalCid(result.cid);
      setEditText(result.text);
      setEditing(false);
    } catch (error: any) {
      setEditError(error?.message || "Impossible de modifier la publication.");
    } finally {
      setSavingEdit(false);
    }
  };

  const editLength = Array.from(editText).length;

  return (
    <article
      onClick={card}
      className={`p-4 transition-colors hover:bg-kelo-background/60 ${disableThreadLink ? "" : "cursor-pointer"}`}
    >
      {post.repostedBy && (
        <div className="mb-2 flex items-center gap-2 pl-10 text-xs font-semibold text-kelo-muted">
          <Repeat2 className="h-3.5 w-3.5" />
          <span className="truncate">{post.repostedBy.displayName || post.repostedBy.handle} a reposté</span>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href={`/profile/${handle}`}
          onClick={(event) => event.stopPropagation()}
          className="flex-shrink-0"
        >
          <Avatar src={post.author?.avatar} fallback={handle ? handle[0].toUpperCase() : "U"} />
        </Link>

        <div className="min-w-0 flex-grow">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link
                href={`/profile/${handle}`}
                onClick={(event) => event.stopPropagation()}
                className="flex min-w-0 flex-wrap items-center gap-2 hover:underline"
              >
                <span className="max-w-full truncate font-bold text-kelo-primary">
                  {post.author?.displayName || "Utilisateur"}
                </span>
              </Link>
              <span onClick={(event) => event.stopPropagation()}>
                <AccountBadges actor={post.author} identitySize="sm" certificationSize={16} gap="xs" />
              </span>
              {relativeTime && <span className="text-sm text-kelo-primary/60">· {relativeTime}</span>}
            </div>

            {isMine && (
              <div className="relative" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-primary"
                  aria-label="Options de la publication"
                  aria-expanded={menuOpen}
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-2xl border border-kelo-border bg-white p-1.5 shadow-xl dark:bg-zinc-950">
                    <button
                      type="button"
                      onClick={startEditing}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-kelo-text transition hover:bg-kelo-background"
                    >
                      <Pencil className="h-4 w-4" />
                      Modifier le post
                    </button>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <div
              className="mt-3 rounded-2xl border border-kelo-border bg-kelo-background/50 p-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-kelo-text">Modifier le post</span>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={savingEdit}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-kelo-muted hover:bg-white/70"
                  aria-label="Annuler la modification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
                rows={4}
                autoFocus
                className="w-full resize-y rounded-xl border border-kelo-border bg-white px-3 py-2 text-sm text-kelo-text outline-none focus:ring-2 focus:ring-kelo-primary/30 dark:bg-zinc-950"
                placeholder="Modifier votre publication..."
              />

              <div className="mt-2 flex items-center justify-between gap-3">
                <span className={`text-xs ${editLength > POST_CHARACTER_LIMIT ? "font-bold text-red-600" : "text-kelo-muted"}`}>
                  {editLength}/{POST_CHARACTER_LIMIT}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={savingEdit}
                    className="rounded-xl px-3 py-2 text-xs font-bold text-kelo-muted hover:bg-white/70"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={savingEdit || editLength > POST_CHARACTER_LIMIT || editText === localText}
                    className="rounded-xl bg-kelo-gradient px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingEdit ? "Modification..." : "Enregistrer"}
                  </button>
                </div>
              </div>

              {editError && <p className="mt-2 text-xs font-semibold text-red-600">{editError}</p>}
            </div>
          ) : (
            <SensitiveContentGate post={post}>
              <PostText text={localText} facets={localFacets} />
              <PostEmbed embed={post.embed} />
              <PostTranslation text={localText} />
            </SensitiveContentGate>
          )}

          <PostActions
            post={{ ...post, cid: localCid, record: { ...post.record, text: localText, facets: localFacets } }}
            replyCount={post.replyCount || 0}
            repostCount={localRepostCount}
            likeCount={localLikeCount}
            isLiked={liked}
            isReposted={reposted}
            isBookmarked={isBookmarked}
            onReply={() => {
              if (requireVerification()) onToggleReply?.();
            }}
            onRepost={repost}
            onLike={like}
            onBookmark={onBookmark}
            onBlocked={onBlocked}
            onMuted={onMuted}
            liking={liking}
            reposting={reposting}
          />

          {replyOpen && (
            <div
              className="mt-3 flex gap-2 border-t border-kelo-border pt-3"
              onClick={(event) => event.stopPropagation()}
            >
              <input
                value={replyText}
                onChange={(event) => onReplyTextChange?.(event.target.value)}
                placeholder="Votre commentaire..."
                className="min-w-0 flex-grow rounded-xl bg-kelo-background px-3 py-2 text-sm"
              />
              <button
                onClick={reply}
                disabled={replying || !replyText?.trim()}
                className="rounded-xl bg-kelo-gradient px-4 py-2 text-xs font-bold text-white"
              >
                {replying ? "Envoi..." : "Répondre"}
              </button>
            </div>
          )}
        </div>
      </div>

      <VerificationRequiredDialog open={dialogOpen} onClose={closeDialog} />
    </article>
  );
}
