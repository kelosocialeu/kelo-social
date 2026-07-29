"use client";

import { MessageCircle, Repeat2, Heart, Bookmark, Share, MoreHorizontal } from "lucide-react";

interface PostActionsProps {
  replyCount: number;
  repostCount: number;
  likeCount: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  onReply?: () => void;
  onRepost?: () => void;
  onLike?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onMore?: () => void;
}

/**
 * Rangée d'actions d'une publication : commentaire / repost / like à
 * gauche, conserver / partager / plus à droite — même mise en page sur
 * Feed, Profil, Conservés et le fil de publication.
 */
export default function PostActions({
  replyCount,
  repostCount,
  likeCount,
  isLiked,
  isReposted,
  isBookmarked,
  onReply,
  onRepost,
  onLike,
  onBookmark,
  onShare,
  onMore,
}: PostActionsProps) {
  return (
    <div className="mt-3 flex items-center justify-between text-kelo-muted">
      <div className="flex items-center gap-6">
        <button
          onClick={onReply}
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-kelo-primary"
        >
          <MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />
          {replyCount > 0 && <span>{replyCount}</span>}
        </button>

        <button
          onClick={onRepost}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isReposted ? "font-semibold text-kelo-success" : "hover:text-kelo-success"
          }`}
        >
          <Repeat2 className="h-[19px] w-[19px]" strokeWidth={2} />
          {repostCount > 0 && <span>{repostCount}</span>}
        </button>

        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isLiked ? "font-semibold text-kelo-secondary" : "hover:text-kelo-secondary"
          }`}
        >
          <Heart className="h-[18px] w-[18px]" strokeWidth={2} fill={isLiked ? "currentColor" : "none"} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onBookmark}
          className={`transition-colors ${isBookmarked ? "text-kelo-primary" : "hover:text-kelo-primary"}`}
          title="Conserver"
        >
          <Bookmark className="h-[18px] w-[18px]" strokeWidth={2} fill={isBookmarked ? "currentColor" : "none"} />
        </button>
        <button onClick={onShare} className="transition-colors hover:text-kelo-primary" title="Partager">
          <Share className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <button onClick={onMore} className="transition-colors hover:text-kelo-text" title="Plus">
          <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
