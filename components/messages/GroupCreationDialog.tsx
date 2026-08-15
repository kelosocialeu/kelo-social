"use client";

import { useMemo, useState } from "react";
import { X, UsersRound } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  getOrCreateGroupConversation,
  MAX_GROUP_PARTICIPANTS,
  resolveHandleToDid,
} from "@/lib/atproto/chat";

interface GroupCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

function normalizeHandles(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;\s]+/)
        .map((handle) => handle.trim().replace(/^@/, "").toLowerCase())
        .filter(Boolean)
    )
  );
}

export default function GroupCreationDialog({
  open,
  onClose,
  onCreated,
}: GroupCreationDialogProps) {
  const [handlesText, setHandlesText] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handles = useMemo(() => normalizeHandles(handlesText), [handlesText]);
  const totalParticipants = handles.length + 1;
  const tooMany = totalParticipants > MAX_GROUP_PARTICIPANTS;
  const canCreate = handles.length >= 2 && !tooMany && !creating;

  if (!open) return null;

  const handleCreate = async () => {
    if (!canCreate) return;

    setCreating(true);
    setError("");

    try {
      const results = await Promise.allSettled(
        handles.map(async (handle) => ({
          handle,
          did: await resolveHandleToDid(handle),
        }))
      );

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected");

      if (failed.length > 0) {
        throw new Error(
          `${failed.length} compte${failed.length > 1 ? "s" : ""} n’a pas pu être trouvé. Vérifiez les handles.`
        );
      }

      const memberDids = results
        .filter((result): result is PromiseFulfilledResult<{ handle: string; did: string }> => result.status === "fulfilled")
        .map((result) => result.value.did);

      const conversation = await getOrCreateGroupConversation(memberDids);
      setHandlesText("");
      onCreated(conversation.id);
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Impossible de créer ce groupe pour le moment."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-dialog-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-kelo-border bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-kelo-background">
              <UsersRound className="h-5 w-5" />
            </span>
            <div>
              <h2 id="group-dialog-title" className="text-lg font-extrabold text-kelo-text">
                Créer un groupe
              </h2>
              <p className="mt-0.5 text-xs text-kelo-muted">
                Jusqu’à {MAX_GROUP_PARTICIPANTS} participants, créateur compris.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-kelo-background"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          <div>
            <label htmlFor="group-handles" className="text-sm font-bold text-kelo-text">
              Membres du groupe
            </label>
            <p className="mt-1 text-xs leading-5 text-kelo-muted">
              Entrez au moins 2 handles AT Protocol. Vous pouvez les séparer par des espaces, des virgules ou des retours à la ligne.
            </p>
            <textarea
              id="group-handles"
              value={handlesText}
              onChange={(event) => setHandlesText(event.target.value)}
              placeholder={"@utilisateur1.bsky.social\n@utilisateur2.kelosocial.eu"}
              rows={8}
              className="mt-3 w-full resize-y rounded-2xl border border-kelo-border bg-kelo-background px-4 py-3 text-sm outline-none transition focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/20"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-kelo-background px-4 py-3">
            <div>
              <p className="text-sm font-bold text-kelo-text">
                {totalParticipants} / {MAX_GROUP_PARTICIPANTS} participants
              </p>
              <p className="mt-0.5 text-xs text-kelo-muted">
                {handles.length} personne{handles.length > 1 ? "s" : ""} invitée{handles.length > 1 ? "s" : ""} + vous
              </p>
            </div>
            {tooMany && (
              <span className="text-xs font-bold text-kelo-danger">
                Maximum dépassé
              </span>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              loading={creating}
              loadingText="Création..."
              className="w-full px-6 sm:w-auto"
            >
              Créer le groupe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
