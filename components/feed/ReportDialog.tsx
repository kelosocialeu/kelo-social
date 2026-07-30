"use client";

import { useState } from "react";
import type { ReportReason } from "@/lib/atproto/moderation";

interface ReportDialogProps {
  onSubmit: (reason: ReportReason) => void;
  onCancel: () => void;
  submitting?: boolean;
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "com.atproto.moderation.defs#reasonSpam", label: "Spam" },
  { value: "com.atproto.moderation.defs#reasonViolation", label: "Enfreint les règles ou la loi" },
  { value: "com.atproto.moderation.defs#reasonMisleading", label: "Trompeur" },
  { value: "com.atproto.moderation.defs#reasonSexual", label: "Contenu sexuel non désiré" },
  { value: "com.atproto.moderation.defs#reasonRude", label: "Harcèlement ou comportement hostile" },
  { value: "com.atproto.moderation.defs#reasonOther", label: "Autre" },
];

export default function ReportDialog({ onSubmit, onCancel, submitting }: ReportDialogProps) {
  const [selected, setSelected] = useState<ReportReason>("com.atproto.moderation.defs#reasonSpam");

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl border border-kelo-border bg-white p-5 shadow-kelo"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-extrabold text-kelo-text">Signaler cette publication</h3>

        <div className="flex flex-col gap-2">
          {REASONS.map((reason) => (
            <label
              key={reason.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
                selected === reason.value ? "border-kelo-primary bg-kelo-background" : "border-kelo-border"
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                checked={selected === reason.value}
                onChange={() => setSelected(reason.value)}
                className="accent-kelo-primary"
              />
              {reason.label}
            </label>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="w-1/2 rounded-full bg-kelo-background py-2.5 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60"
          >
            Annuler
          </button>
          <button
            onClick={() => onSubmit(selected)}
            disabled={submitting}
            className="w-1/2 rounded-full bg-kelo-gradient py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Envoi..." : "Signaler"}
          </button>
        </div>
      </div>
    </div>
  );
}
