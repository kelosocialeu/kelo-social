"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Repeat2 } from "lucide-react";

import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
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

  /**
   * À utiliser sur la page du fil de publication elle-même
   * afin d’éviter de naviguer vers la même page.
   */
  disableThreadLink?: boolean;
}

/**
 * Affichage complet d’une publication.
 *
 * Ce composant est réutilisé sur :
 * - le fil d’actualité ;
 * - les profils ;
 * - les publications conservées ;
 * - la recherche ;
 * - le fil de discussion d’une publication.
 *
 * Il affiche désormais :
 * - la vérification d’identité Kelo ID / Kelo Verify ;
 * - la certification native ou Kelo ;
 * - le statut de certificateur de confiance ;
 * - les médias et actions de la publication.
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
    if (
      disableThreadLink ||
      !post.uri ||
      post.uri.startsWith("local-")
    ) {
      return;
    }

    router.push(
      `/post?uri=${encodeURIComponent(post.uri)}`
    );
  };

  return (
    <article
      onClick={handleCardClick}
      className={`p-4 transition-colors hover:bg-kelo-background/60 ${
        disableThreadLink ? "" : "cursor-pointer"
      }`}
    >
      {post.repostedBy && (
        <div className="mb-2 flex items-center gap-2 pl-10 text-xs font-semibold text-kelo-muted">
          <Repeat2 className="h-3.5 w-3.5" />

          <span className="truncate">
            {post.repostedBy.displayName ||
              post.repostedBy.handle}{" "}
            a reposté
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href={`/profile/${handle}`}
          onClick={(event) =>
            event.stopPropagation()
          }
          className="flex-shrink-0"
        >
          <Avatar
            src={post.author?.avatar}
            fallback={
              handle
                ? handle[0].toUpperCase()
                : "U"
            }
          />
        </Link>

        <div className="min-w-0 flex-grow">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link
                href={`/profile/${handle}`}
                onClick={(event) =>
                  event.stopPropagation()
                }
                className="flex min-w-0 flex-wrap items-center gap-2 hover:underline"
              >
                <span className="max-w-full truncate font-bold text-kelo-text">
                  {post.author?.displayName ||
                    "Utilisateur"}
                </span>

                <span className="max-w-full truncate text-sm text-kelo-muted">
                  @{handle}
                </span>
              </Link>

              <span
                onClick={(event) =>
                  event.stopPropagation()
                }
                className="flex flex-shrink-0 items-center"
              >
                <AccountBadges
                  actor={post.author}
                  identitySize="sm"
                  certificationSize={16}
                  gap="xs"
                />
              </span>
            </div>

            {isMine && onDelete && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                className="flex-shrink-0 text-xs font-bold text-kelo-muted transition-colors hover:text-kelo-danger"
                title="Supprimer"
                aria-label="Supprimer la publication"
              >
                🗑️
              </button>
            )}
          </div>

          <PostText
            text={post.record?.text || ""}
            facets={post.record?.facets}
          />

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
            <div
              className="mt-3 flex gap-2 border-t border-kelo-border pt-3"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <input
                type="text"
                value={replyText}
                onChange={(event) =>
                  onReplyTextChange?.(
                    event.target.value
                  )
                }
                placeholder="Votre commentaire..."
                className="min-w-0 flex-grow rounded-xl bg-kelo-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
              />

              <button
                type="button"
                onClick={onSendReply}
                disabled={!replyText?.trim()}
                className="flex-shrink-0 rounded-xl bg-kelo-gradient px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Répondre
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
