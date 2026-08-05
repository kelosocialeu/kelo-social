"use client";

import { useState } from "react";

import type {
  ReportReason,
} from "@/lib/atproto/moderation";

interface ReportDialogProps {
  onSubmit: (
    reason: ReportReason,
    description?: string
  ) => void | Promise<void>;

  onCancel: () => void;
  submitting?: boolean;
}

const MAX_DESCRIPTION_LENGTH = 2000;

const REASONS: {
  value: ReportReason;
  label: string;
}[] = [
  {
    value:
      "com.atproto.moderation.defs#reasonSpam",
    label: "Spam",
  },
  {
    value:
      "com.atproto.moderation.defs#reasonViolation",
    label: "Enfreint les règles ou la loi",
  },
  {
    value:
      "com.atproto.moderation.defs#reasonMisleading",
    label: "Contenu trompeur",
  },
  {
    value:
      "com.atproto.moderation.defs#reasonSexual",
    label: "Contenu sexuel non désiré",
  },
  {
    value:
      "com.atproto.moderation.defs#reasonRude",
    label:
      "Harcèlement ou comportement hostile",
  },
  {
    value:
      "com.atproto.moderation.defs#reasonOther",
    label: "Autre",
  },
];

export default function ReportDialog({
  onSubmit,
  onCancel,
  submitting = false,
}: ReportDialogProps) {
  const [selected, setSelected] =
    useState<ReportReason>(
      "com.atproto.moderation.defs#reasonSpam"
    );

  const [description, setDescription] =
    useState("");

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const cleanDescription =
      description.trim() || undefined;

    await onSubmit(
      selected,
      cleanDescription
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => {
        if (!submitting) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-kelo-border bg-white p-5 shadow-kelo sm:p-6"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <h3
          id="report-dialog-title"
          className="text-base font-extrabold text-kelo-text sm:text-lg"
        >
          Signaler cette publication
        </h3>

        <p className="mt-1 text-sm leading-relaxed text-kelo-muted">
          Le signalement sera envoyé au service de
          modération associé à votre compte AT Protocol.
        </p>

        <fieldset
          disabled={submitting}
          className="mt-5"
        >
          <legend className="mb-3 text-sm font-bold text-kelo-text">
            Motif du signalement
          </legend>

          <div className="flex flex-col gap-2">
            {REASONS.map((reason) => {
              const active =
                selected === reason.value;

              return (
                <label
                  key={reason.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm transition-colors ${
                    active
                      ? "border-kelo-primary bg-kelo-background"
                      : "border-kelo-border hover:bg-kelo-background/60"
                  } ${
                    submitting
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason.value}
                    checked={active}
                    onChange={() =>
                      setSelected(reason.value)
                    }
                    className="h-4 w-4 accent-kelo-primary"
                  />

                  <span className="font-medium text-kelo-text">
                    {reason.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="report-description"
              className="text-sm font-bold text-kelo-text"
            >
              Informations supplémentaires
            </label>

            <span className="text-xs text-kelo-muted">
              {description.length}/
              {MAX_DESCRIPTION_LENGTH}
            </span>
          </div>

          <textarea
            id="report-description"
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value.slice(
                  0,
                  MAX_DESCRIPTION_LENGTH
                )
              )
            }
            disabled={submitting}
            maxLength={
              MAX_DESCRIPTION_LENGTH
            }
            rows={4}
            placeholder="Décrivez brièvement le problème, si nécessaire..."
            className="w-full resize-none rounded-2xl border border-kelo-border bg-kelo-background px-4 py-3 text-sm text-kelo-text outline-none transition placeholder:text-kelo-muted focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <p className="mt-2 text-xs leading-relaxed text-kelo-muted">
            Ce champ est facultatif. Évitez
            d’ajouter des informations personnelles
            sensibles.
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-full rounded-full bg-kelo-background py-2.5 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-full bg-kelo-gradient py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            {submitting
              ? "Envoi du signalement..."
              : "Envoyer le signalement"}
          </button>
        </div>
      </div>
    </div>
  );
}
