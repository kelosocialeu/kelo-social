"use client";

import { useState } from "react";
import {
  Ban,
  Bookmark,
  Copy,
  EyeOff,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Share,
} from "lucide-react";

import ShareMenu from "@/components/feed/ShareMenu";
import ReportDialog from "@/components/feed/ReportDialog";

import {
  blockActor,
  muteActor,
  reportPost,
  ReportReason,
} from "@/lib/atproto/moderation";

interface PostSummary {
  uri: string;
  cid: string;
  author: {
    did?: string;
    handle?: string;
  };
  record: {
    text: string;
  };
}

interface PostActionsProps {
  post: PostSummary;

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
  onBlocked?: () => void;
  onMuted?: () => void;

  /**
   * Empêche les doubles clics pendant l’écriture
   * du record de like dans le PDS.
   */
  liking?: boolean;

  /**
   * Empêche les doubles clics pendant l’écriture
   * du record de republication dans le PDS.
   */
  reposting?: boolean;
}

/**
 * Rangée d’actions d’une publication.
 *
 * Les likes, republications et réponses sont déclenchés
 * depuis PostCard, qui gère les écritures AT Protocol.
 *
 * Ce composant gère directement :
 * - conserver ;
 * - partager ;
 * - copier ;
 * - masquer ;
 * - signaler ;
 * - bloquer.
 */
export default function PostActions({
  post,
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
  onBlocked,
  onMuted,
  liking = false,
  reposting = false,
}: PostActionsProps) {
  const [openMenu, setOpenMenu] = useState<
    "share" | "more" | null
  >(null);

  const [reportOpen, setReportOpen] =
    useState(false);

  const [reporting, setReporting] =
    useState(false);

  const [blocking, setBlocking] =
    useState(false);

  const [muting, setMuting] =
    useState(false);

  const [copiedFeedback, setCopiedFeedback] =
    useState(false);

  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/post?uri=${encodeURIComponent(
          post.uri
        )}`
      : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        postUrl
      );

      setCopiedFeedback(true);

      window.setTimeout(() => {
        setCopiedFeedback(false);
      }, 1500);
    } catch (error) {
      console.error(
        "Impossible de copier le lien :",
        error
      );
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(
        post.record?.text || ""
      );
    } catch (error) {
      console.error(
        "Impossible de copier le texte :",
        error
      );
    } finally {
      setOpenMenu(null);
    }
  };

  const handleBlock = async () => {
    if (
      blocking ||
      !post.author?.did
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Bloquer @${post.author.handle || "ce compte"} ? Vous ne verrez plus ses publications.`
    );

    if (!confirmed) {
      return;
    }

    setBlocking(true);

    try {
      await blockActor(post.author.did);
      onBlocked?.();
      setOpenMenu(null);
    } catch (error) {
      console.error(
        "Impossible de bloquer ce compte :",
        error
      );

      alert(
        "Impossible de bloquer ce compte."
      );
    } finally {
      setBlocking(false);
    }
  };

  const handleMute = async () => {
    if (
      muting ||
      !post.author?.did
    ) {
      return;
    }

    setMuting(true);

    try {
      await muteActor(post.author.did);
      onMuted?.();
      setOpenMenu(null);
    } catch (error) {
      console.error(
        "Impossible de masquer ce compte :",
        error
      );

      alert(
        "Impossible de masquer ce compte."
      );
    } finally {
      setMuting(false);
    }
  };

  const handleReportSubmit = async (
    reason: ReportReason,
    description?: string
  ) => {
    if (reporting) {
      return;
    }

    if (!post.uri || !post.cid) {
      alert(
        "Cette publication ne peut pas être signalée car sa référence AT Protocol est incomplète."
      );
      return;
    }

    setReporting(true);

    try {
      await reportPost(
        post.uri,
        post.cid,
        reason,
        description
      );

      setReportOpen(false);

      alert(
        "Publication signalée. Merci de contribuer à un réseau plus sain."
      );
    } catch (error) {
      console.error(
        "Impossible d’envoyer le signalement :",
        error
      );

      alert(
        "Impossible d’envoyer ce signalement."
      );
    } finally {
      setReporting(false);
    }
  };

  return (
    <div
      className="relative mt-3 flex items-center justify-between text-kelo-muted"
      onClick={(event) =>
        event.stopPropagation()
      }
    >
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onReply}
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-kelo-primary"
          title="Répondre"
          aria-label="Répondre"
        >
          <MessageCircle
            className="h-[18px] w-[18px]"
            strokeWidth={2}
          />

          {replyCount > 0 && (
            <span>{replyCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onRepost}
          disabled={reposting}
          className={`flex items-center gap-1.5 text-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${
            isReposted
              ? "font-semibold text-kelo-success"
              : "hover:text-kelo-success"
          }`}
          title={
            isReposted
              ? "Annuler la republication"
              : "Republier"
          }
          aria-label={
            isReposted
              ? "Annuler la republication"
              : "Republier"
          }
          aria-busy={reposting}
        >
          <Repeat2
            className={`h-[19px] w-[19px] ${
              reposting
                ? "animate-pulse"
                : ""
            }`}
            strokeWidth={2}
          />

          {repostCount > 0 && (
            <span>{repostCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={onLike}
          disabled={liking}
          className={`flex items-center gap-1.5 text-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${
            isLiked
              ? "font-semibold text-kelo-secondary"
              : "hover:text-kelo-secondary"
          }`}
          title={
            isLiked
              ? "Retirer le like"
              : "J’aime"
          }
          aria-label={
            isLiked
              ? "Retirer le like"
              : "J’aime"
          }
          aria-busy={liking}
        >
          <Heart
            className={`h-[18px] w-[18px] ${
              liking
                ? "animate-pulse"
                : ""
            }`}
            strokeWidth={2}
            fill={
              isLiked
                ? "currentColor"
                : "none"
            }
          />

          {likeCount > 0 && (
            <span>{likeCount}</span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBookmark}
          className={`transition-colors ${
            isBookmarked
              ? "text-kelo-primary"
              : "hover:text-kelo-primary"
          }`}
          title="Conserver"
          aria-label="Conserver"
        >
          <Bookmark
            className="h-[18px] w-[18px]"
            strokeWidth={2}
            fill={
              isBookmarked
                ? "currentColor"
                : "none"
            }
          />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setOpenMenu(
                openMenu === "share"
                  ? null
                  : "share"
              )
            }
            className="transition-colors hover:text-kelo-primary"
            title="Partager"
            aria-label="Partager"
          >
            <Share
              className="h-[18px] w-[18px]"
              strokeWidth={2}
            />
          </button>

          {copiedFeedback && (
            <span className="absolute right-0 top-full z-30 mt-1 whitespace-nowrap rounded-lg bg-kelo-text px-2 py-1 text-xs text-white">
              Lien copié !
            </span>
          )}

          {openMenu === "share" && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() =>
                  setOpenMenu(null)
                }
              />

              <ShareMenu
                postUrl={postUrl}
                postText={
                  post.record?.text || ""
                }
                onCopyLink={handleCopyLink}
                onClose={() =>
                  setOpenMenu(null)
                }
              />
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setOpenMenu(
                openMenu === "more"
                  ? null
                  : "more"
              )
            }
            className="transition-colors hover:text-kelo-text"
            title="Plus"
            aria-label="Plus d’actions"
          >
            <MoreHorizontal
              className="h-[18px] w-[18px]"
              strokeWidth={2}
            />
          </button>

          {openMenu === "more" && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() =>
                  setOpenMenu(null)
                }
              />

              <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
                >
                  <Copy className="h-4 w-4" />
                  Copier le texte
                </button>

                <button
                  type="button"
                  onClick={handleMute}
                  disabled={muting}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background disabled:cursor-wait disabled:opacity-50"
                >
                  <EyeOff className="h-4 w-4" />

                  {muting
                    ? "Masquage..."
                    : "Masquer ce compte"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    setReportOpen(true);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
                >
                  <Flag className="h-4 w-4" />
                  Signaler ce post
                </button>

                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={blocking}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-danger transition-colors hover:bg-kelo-background disabled:cursor-wait disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" />

                  {blocking
                    ? "Blocage..."
                    : "Bloquer ce compte"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {reportOpen && (
        <ReportDialog
          submitting={reporting}
          onCancel={() => {
            if (!reporting) {
              setReportOpen(false);
            }
          }}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}
