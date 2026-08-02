"use client";

import { useState } from "react";
import { MessageCircle, Repeat2, Heart, Bookmark, Share, MoreHorizontal, Ban, Flag, EyeOff, Copy } from "lucide-react";
import ShareMenu from "@/components/feed/ShareMenu";
import ReportDialog from "@/components/feed/ReportDialog";
import { blockActor, muteActor, reportPost, ReportReason } from "@/lib/atproto/moderation";

interface PostSummary {
  uri: string;
  cid: string;
  author: { did?: string; handle?: string };
  record: { text: string };
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
}

/**
 * Rangée d'actions d'une publication : commentaire / repost / like à
 * gauche, conserver / partager / plus à droite — même mise en page sur
 * Feed, Profil, Conservés et le fil de publication. Le partage et le menu
 * "plus" (bloquer/signaler/masquer/copier) sont gérés ici directement.
 * Le clic sur cette rangée ne doit jamais déclencher la navigation vers
 * le fil de publication (géré par PostCard) — d'où le stopPropagation
 * sur le conteneur racine.
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
}: PostActionsProps) {
  const [openMenu, setOpenMenu] = useState<"share" | "more" | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const postUrl =
    typeof window !== "undefined" ? `${window.location.origin}/post?uri=${encodeURIComponent(post.uri)}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1500);
    } catch {
      // silencieux : le presse-papier peut être refusé selon le navigateur
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(post.record.text);
    } catch {
      // silencieux
    }
    setOpenMenu(null);
  };

  const handleBlock = async () => {
    if (!post.author?.did) return;
    if (!confirm(`Bloquer @${post.author.handle} ? Vous ne verrez plus ses publications.`)) return;
    try {
      await blockActor(post.author.did);
      onBlocked?.();
    } catch (err) {
      console.error(err);
      alert("Impossible de bloquer ce compte.");
    }
    setOpenMenu(null);
  };

  const handleMute = async () => {
    if (!post.author?.did) return;
    try {
      await muteActor(post.author.did);
      onMuted?.();
    } catch (err) {
      console.error(err);
      alert("Impossible de masquer ce compte.");
    }
    setOpenMenu(null);
  };

  const handleReportSubmit = async (reason: ReportReason) => {
    setReporting(true);
    try {
      await reportPost(post.uri, post.cid, reason);
      setReportOpen(false);
      alert("Publication signalée. Merci de contribuer à un réseau plus sain.");
    } catch (err) {
      console.error(err);
      alert("Impossible d'envoyer ce signalement.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div
      className="relative mt-3 flex items-center justify-between text-kelo-muted"
      onClick={(e) => e.stopPropagation()}
    >
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

        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === "share" ? null : "share")}
            className="transition-colors hover:text-kelo-primary"
            title="Partager"
          >
            <Share className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          {copiedFeedback && (
            <span className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-lg bg-kelo-text px-2 py-1 text-xs text-white">
              Lien copié !
            </span>
          )}
          {openMenu === "share" && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
              <ShareMenu
                postUrl={postUrl}
                postText={post.record.text}
                onCopyLink={handleCopyLink}
                onClose={() => setOpenMenu(null)}
              />
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === "more" ? null : "more")}
            className="transition-colors hover:text-kelo-text"
            title="Plus"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          {openMenu === "more" && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
                <button
                  onClick={handleCopyText}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
                >
                  <Copy className="h-4 w-4" />
                  Copier le texte
                </button>
                <button
                  onClick={handleMute}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
                >
                  <EyeOff className="h-4 w-4" />
                  Masquer ce compte
                </button>
                <button
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
                  onClick={handleBlock}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-danger transition-colors hover:bg-kelo-background"
                >
                  <Ban className="h-4 w-4" />
                  Bloquer ce compte
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {reportOpen && (
        <ReportDialog
          submitting={reporting}
          onCancel={() => setReportOpen(false)}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}
