"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Ban, Flag, EyeOff, Link2, BadgeCheck } from "lucide-react";
import Avatar from "@/components/feed/Avatar";
import Badge from "@/components/ui/Badge";
import { isTrustedVerifier } from "@/lib/atproto/certifications";
import { getStoredSession } from "@/services/auth.service";
import ReportDialog from "@/components/feed/ReportDialog";
import {
  blockActor,
  unblockActorByDid,
  isActorBlocked,
  muteActor,
  reportAccount,
  ReportReason,
} from "@/lib/atproto/moderation";

interface ProfileMoreMenuProps {
  did: string;
  handle: string;
  onBlocked?: () => void;
  onMuted?: () => void;
  displayName?: string;
  avatar?: string;
}

export default function ProfileMoreMenu({ did, handle, onBlocked, onMuted, displayName, avatar }: ProfileMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [isTrusted, setIsTrusted] = useState(false);
  const [certifyOpen, setCertifyOpen] = useState(false);
  const [certifying, setCertifying] = useState(false);
  const session = getStoredSession();
  const isOwnProfile = Boolean(session?.did && session.did.toLowerCase() === did.toLowerCase());

  useEffect(() => {
    let cancelled = false;
    if (session?.did) isTrustedVerifier(session.did).then((value) => { if (!cancelled) setIsTrusted(value); }).catch(() => {});
    isActorBlocked(did)
      .then((value) => { if (!cancelled) setBlocked(value); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [did]);

  const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/profile/${handle}` : "";

  const handleCertification = async () => {
    if (certifying) return;
    if (!session) {
      alert("Session introuvable. Reconnectez-vous.");
      return;
    }
    setCertifying(true);
    try {
      const response = await fetch("/api/admin/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, targetHandle: handle, targetDid: did, status: "certified" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Impossible d’attribuer la certification.");
      setCertifyOpen(false);
      setOpen(false);
      window.dispatchEvent(new CustomEvent("kelo:certification-changed", { detail: { did, handle } }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Impossible d’attribuer la certification.");
    } finally {
      setCertifying(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1500);
    } catch {}
    setOpen(false);
  };

  const handleBlockToggle = async () => {
    if (blocking) return;
    if (!blocked && !confirm(`Bloquer @${handle} ? Ce compte ne pourra plus interagir normalement avec vous et ses publications seront masquées sur Kelo Social.`)) return;

    setBlocking(true);
    const nextBlocked = !blocked;
    try {
      if (blocked) {
        await unblockActorByDid(did);
        setBlocked(false);
      } else {
        await blockActor(did);
        setBlocked(true);
        onBlocked?.();
      }
      window.dispatchEvent(new CustomEvent("kelo:blocklist-changed", { detail: { did, blocked: nextBlocked } }));
    } catch (err) {
      console.error(err);
      alert(blocked ? "Impossible de débloquer ce compte." : "Impossible de bloquer ce compte.");
    } finally {
      setBlocking(false);
      setOpen(false);
    }
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
        <span className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-lg bg-kelo-text px-2 py-1 text-xs text-white">Lien copié !</span>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
            {isTrusted && !isOwnProfile && (
              <button onClick={() => { setOpen(false); setCertifyOpen(true); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-kelo-primary transition-colors hover:bg-kelo-background">
                <BadgeCheck className="h-4 w-4" /> Attribuer une certification
              </button>
            )}
            <button onClick={handleCopyLink} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background">
              <Link2 className="h-4 w-4" /> Copier le lien vers le compte
            </button>
            {!blocked && (
              <button onClick={handleMute} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background">
                <EyeOff className="h-4 w-4" /> Masquer ce compte
              </button>
            )}
            <button
              onClick={() => { setOpen(false); setReportOpen(true); }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-text transition-colors hover:bg-kelo-background"
            >
              <Flag className="h-4 w-4" /> Signaler ce compte
            </button>
            <button
              onClick={handleBlockToggle}
              disabled={blocking}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-kelo-danger transition-colors hover:bg-kelo-background disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              {blocking ? (blocked ? "Déblocage..." : "Blocage...") : (blocked ? "Débloquer cet utilisateur" : "Bloquer cet utilisateur")}
            </button>
          </div>
        </>
      )}

      {certifyOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => !certifying && setCertifyOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-kelo-border bg-white p-6 shadow-kelo">
            <div className="flex flex-col items-center text-center">
              <Avatar src={avatar} fallback={(handle[0] || "K").toUpperCase()} size="lg" gradient />
              <div className="mt-3 flex items-center justify-center gap-2">
                <h3 className="text-lg font-extrabold text-kelo-text">{displayName || handle}</h3>
                <Badge status="certified" size={26} />
              </div>
              <p className="mt-1 text-sm font-semibold text-kelo-muted">@{handle}</p>
              <p className="mt-4 text-sm leading-6 text-kelo-muted">Voulez-vous bien attribuer une <strong className="text-kelo-text">certification</strong> à ce compte ? Le badge rond de certification apparaîtra sur son profil.</p>
              <div className="mt-5 flex w-full gap-3">
                <button type="button" onClick={() => setCertifyOpen(false)} disabled={certifying} className="flex-1 rounded-full bg-kelo-background px-4 py-2.5 text-sm font-bold text-kelo-text disabled:opacity-50">Annuler</button>
                <button type="button" onClick={handleCertification} disabled={certifying} className="flex-1 rounded-full bg-kelo-gradient px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{certifying ? "Certification..." : "Certifier le compte"}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {reportOpen && (
        <ReportDialog submitting={reporting} onCancel={() => setReportOpen(false)} onSubmit={handleReportSubmit} />
      )}
    </div>
  );
}
