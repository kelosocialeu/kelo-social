"use client";

import { useState } from "react";
import { MoreHorizontal, Ban, Flag, EyeOff, Link2 } from "lucide-react";
import ReportDialog from "@/components/feed/ReportDialog";
import { blockActor, muteActor, reportAccount, ReportReason } from "@/lib/atproto/moderation";

interface ProfileMoreMenuProps {
  did: string;
  handle: string;
  onBlocked?: () => void;
  onMuted?: () => void;
}

export default function ProfileMoreMenu({ did, handle, onBlocked, onMuted }: ProfileMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/profile/${handle}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1500);
    } catch {
      // silencieux : le presse-papier peut être refusé selon le navigateur
    }
    setOpen(false);
  };

  const handleBlock = async () => {
    if (!confirm(`Bloquer @${handle} ? Vous ne verrez plus ses publications.`)) return;
    try {
      await blockActor(did);
      onBlocked?.();
    } catch (err) {
      console.error(err);
      alert("Impossible de bloquer ce compte.");
    }
    setOpen(false);
  };

  const handleMute = async () => {
    try {
      await muteActor(did);
      onMuted?.();
    } catch (err) {
      console.error(err);
      alert("Impossible de masquer ce compte.");
    }
    setOpen(false);
  };

  const handleReportSubmit = async (reason: ReportReason) => {
    setReporting(true);
    try {
      await reportAccount(did, reason);
      setReportOpen(false);
      alert("Compte signalé. Merci de contribuer à un réseau plus sain.");
    } catch (err) {
      console.error(err);
      alert("Impossible d'envoyer ce signalement.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-kelo-border text-kelo-muted transition-colors hover:bg-kelo-background hover:text-kelo-text"
        title="Plus"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>

      {copiedFeedback && (
        <span className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-lg bg-kelo-text px-2 py-1 text-xs text-white">
          Lien copié !
        </span>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
            >
              <Link2 className="h-4 w-4" />
              Copier le lien vers le compte
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
                setOpen(false);
                setReportOpen(true);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
            >
              <Flag className="h-4 w-4" />
              Signaler ce compte
            </button>
            <button
              onClick={handleBlock}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-danger transition-colors hover:bg-kelo-background"
            >
              <Ban className="h-4 w-4" />
              Bloquer cet utilisateur
            </button>
          </div>
        </>
      )}

      {reportOpen && (
        <ReportDialog submitting={reporting} onCancel={() => setReportOpen(false)} onSubmit={handleReportSubmit} />
      )}
    </div>
  );
}
