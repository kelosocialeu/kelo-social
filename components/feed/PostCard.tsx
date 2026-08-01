"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Repeat2 } from "lucide-react";
import Avatar from "@/components/feed/Avatar";
import VerificationBadge from "@/components/ui/VerificationBadge";
import PostText from "@/components/feed/PostText";
import PostEmbed from "@/components/feed/PostEmbed";
import PostActions from "@/components/feed/PostActions";

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
  /** À passer sur la page du fil de publication elle-même, pour éviter de re-naviguer vers la même page. */
  disableThreadLink?: boolean;
}

/**
 * Affichage complet d'une publication : cliquer dessus ouvre son fil de
 * discussion complet (/post?uri=...). Avatar/nom restent cliquables vers
 * le profil de l'auteur, badge de vérification réseau (rond/fleur),
 * bandeau "a reposté" si c'est un repost dans le fil, texte enrichi
 * (mentions/liens/hashtags cliquables), médias (images, vidéo, lien),
 * actions (commentaire/repost/like/conserver/partager/plus) et zone de
 * réponse. Composant unique réutilisé sur Feed, Profil, Conservés,
 * Recherche et le fil de publication.
 */
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
  const handle = post.author?.handle;

  const handleCardClick = () => {
    if (disableThreadLink || !post.uri || post.uri.startsWith("local-")) return;
    router.push(`/post?uri=${encodeURIComponent(post.uri)}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`p-4 transition-colors hover:bg-kelo-background/60 ${
        disableThreadLink ? "" : "cursor-pointer"
      }`}
    >
      {post.repostedBy && (
        <div className="mb-2 flex items-center gap-2 pl-10 text-xs font-semibold text-kelo-muted">
          <Repeat2 className="h-3.5 w-3.5" />
          {post.repostedBy.displayName || post.repostedBy.handle} a reposté
        </div>
      )}

      <div className="flex gap-3">
        <Link href={`/profile/${handle}`} onClick={(e) => e.stopPropagation()}>
          <Avatar src={post.author?.avatar} fallback={handle ? handle[0].toUpperCase() : "U"} />
        </Link>
        <div className="min-w-0 flex-grow">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/profile/${handle}`}
                onClick={(e) => e.stopPropagation()}
                className="flex flex-wrap items-center gap-2 hover:underline"
              >
                <span className="font-bold text-kelo-text">{post.author?.displayName || "Utilisateur"}</span>
                <span className="text-sm text-kelo-muted">@{handle}</span>
              </Link>
              <span onClick={(e) => e.stopPropagation()}>
                <VerificationBadge actor={post.author} />
              </span>
            </div>
            {isMine && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-xs font-bold text-kelo-muted transition-colors hover:text-kelo-danger"
                title="Supprimer"
              >
                🗑️
              </button>
            )}
          </div>

          <PostText text={post.record?.text || ""} facets={post.record?.facets} />
          <PostEmbed embed={post.embed} />

          <PostActions
            post={post}
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
            onBlocked={onBlocked}
            onMuted={onMuted}
          />

          {replyOpen && (
            <div className="mt-3 flex gap-2 border-t border-kelo-border pt-3" onClick={(e) => e.stopPropagation()}>
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
