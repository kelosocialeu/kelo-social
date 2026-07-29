"use client";

import Link from "next/link";
import { Repeat2 } from "lucide-react";
import Avatar from "@/components/feed/Avatar";
import Badge from "@/components/ui/Badge";
import PostActions from "@/components/feed/PostActions";
import type { CertificationStatus } from "@/lib/atproto/certifications";

interface PostCardProps {
  post: any;
  badgeStatus?: CertificationStatus | null;
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
}

/**
 * Affichage complet d'une publication : avatar/nom cliquables vers le
 * profil de l'auteur, bandeau "a reposté" si c'est un repost dans le fil,
 * actions (commentaire/repost/like/conserver), et zone de réponse.
 * Composant unique réutilisé sur Feed, Profil, Conservés et le fil de
 * publication — même apparence partout.
 */
export default function PostCard({
  post,
  badgeStatus,
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
}: PostCardProps) {
  const handle = post.author?.handle;

  return (
    <div className="p-4 transition-colors hover:bg-kelo-background/60">
      {post.repostedBy && (
        <div className="mb-2 flex items-center gap-2 pl-10 text-xs font-semibold text-kelo-muted">
          <Repeat2 className="h-3.5 w-3.5" />
          {post.repostedBy.displayName || post.repostedBy.handle} a reposté
        </div>
      )}

      <div className="flex gap-3">
        <Link href={`/profile/${handle}`}>
          <Avatar src={post.author?.avatar} fallback={handle ? handle[0].toUpperCase() : "U"} />
        </Link>
        <div className="flex-grow">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href={`/profile/${handle}`} className="flex flex-wrap items-center gap-2 hover:underline">
              <span className="font-bold text-kelo-text">{post.author?.displayName || "Utilisateur"}</span>
              {badgeStatus && <Badge status={badgeStatus} />}
              <span className="text-sm text-kelo-muted">@{handle}</span>
            </Link>
            {isMine && onDelete && (
              <button
                onClick={onDelete}
                className="text-xs font-bold text-kelo-muted transition-colors hover:text-kelo-danger"
                title="Supprimer"
              >
                🗑️
              </button>
            )}
          </div>

          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-kelo-text">{post.record?.text}</p>

          <PostActions
            replyCount={post.replyCount || 0}
            repostCount={post.repostCount || 0}
            likeCount={post.likeCount || 0}
            isLiked={!!post.viewer?.like}
            isReposted={!!post.viewer?.repost}
            isBookmarked={isBookmarked}
            onReply={onToggleReply}
            onRepost={onRepost}
            onLike={onLike}
            onBookmark={onBookmark}
          />

          {replyOpen && (
            <div className="mt-3 flex gap-2 border-t border-kelo-border pt-3">
              <input
                type="text"
                value={replyText}
                onChange={(e) => onReplyTextChange?.(e.target.value)}
                placeholder="Votre commentaire..."
                className="w-full rounded-xl bg-kelo-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
              />
              <button
                onClick={onSendReply}
                className="rounded-xl bg-kelo-gradient px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                Répondre
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
