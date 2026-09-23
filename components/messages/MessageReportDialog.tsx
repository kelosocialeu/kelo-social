"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { reportConversationMember } from "@/lib/atproto/chat";

const REASONS = [
  ["com.atproto.moderation.defs#reasonSpam", "Spam"],
  ["com.atproto.moderation.defs#reasonViolation", "Contenu illégal ou dangereux"],
  ["com.atproto.moderation.defs#reasonSexual", "Contenu sexuel"],
  ["com.atproto.moderation.defs#reasonRude", "Harcèlement ou comportement abusif"],
  ["com.atproto.moderation.defs#reasonMisleading", "Contenu trompeur"],
  ["com.atproto.moderation.defs#reasonOther", "Autre"],
] as const;

export default function MessageReportDialog({
  open,
  memberDid,
  onClose,
}: {
  open: boolean;
  memberDid?: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>(REASONS[0][0]);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!open || !memberDid) return null;

  const submit = async () => {
    if (sending) return;
    setSending(true);
    setError("");
    try {
      await reportConversationMember(memberDid, reason, description);
      onClose();
      setDescription("");
      alert("Signalement envoyé.");
    } catch (e: any) {
      setError(e?.message || "Impossible d'envoyer le signalement.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-kelo-danger" />
            <h2 className="text-lg font-extrabold text-kelo-text">Signaler</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-kelo-background" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-kelo-muted">Le signalement sera transmis au système de modération Kelo Social.</p>
        <label className="mt-4 block text-sm font-bold text-kelo-text">
          Motif
          <select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-xl border border-kelo-border bg-white px-3 py-2.5 text-sm">
            {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} placeholder="Précisions facultatives…" className="mt-3 w-full resize-none rounded-xl border border-kelo-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-kelo-primary/30" />
        {error && <p className="mt-2 text-sm text-kelo-danger">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} disabled={sending} className="flex-1 rounded-xl bg-kelo-background px-4 py-2.5 text-sm font-bold">Annuler</button>
          <button type="button" onClick={submit} disabled={sending} className="flex-1 rounded-xl bg-kelo-gradient px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{sending ? "Envoi…" : "Envoyer"}</button>
        </div>
      </div>
    </div>
  );
}
