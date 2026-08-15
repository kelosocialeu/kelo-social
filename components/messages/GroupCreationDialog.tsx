"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, UsersRound, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import {
  getOrCreateGroupConversation,
  MAX_GROUP_PARTICIPANTS,
  searchChatAccounts,
} from "@/lib/atproto/chat";
import { getStoredSession } from "@/services/auth.service";

interface GroupCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

export default function GroupCreationDialog({
  open,
  onClose,
  onCreated,
}: GroupCreationDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const myDid = getStoredSession()?.did;
  const totalParticipants = selected.length + 1;
  const canCreate = selected.length >= 2 && totalParticipants <= MAX_GROUP_PARTICIPANTS && !creating;
  const selectedDids = useMemo(() => new Set(selected.map((actor) => actor.did)), [selected]);

  useEffect(() => {
    if (!open) return;
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timeout = window.setTimeout(async () => {
      try {
        const actors = await searchChatAccounts(cleanQuery, 20);
        if (cancelled) return;
        setResults(actors.filter((actor) => actor.did !== myDid));
      } catch (searchError) {
        if (!cancelled) {
          console.error("Impossible de rechercher les comptes AT Protocol :", searchError);
          setResults([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, open, myDid]);

  if (!open) return null;

  const toggleActor = (actor: any) => {
    if (selectedDids.has(actor.did)) {
      setSelected((current) => current.filter((item) => item.did !== actor.did));
      return;
    }

    if (selected.length + 1 >= MAX_GROUP_PARTICIPANTS) {
      setError(`Un groupe peut contenir au maximum ${MAX_GROUP_PARTICIPANTS} participants, vous compris.`);
      return;
    }

    setError("");
    setSelected((current) => [...current, actor]);
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    setCreating(true);
    setError("");

    try {
      const conversation = await getOrCreateGroupConversation(
        selected.map((actor) => actor.did)
      );
      setSelected([]);
      setQuery("");
      setResults([]);
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

  const close = () => {
    if (creating) return;
    setQuery("");
    setResults([]);
    setSelected([]);
    setError("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={close}
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
              <h2 id="group-dialog-title" className="text-lg font-extrabold text-kelo-text">Créer un groupe</h2>
              <p className="mt-0.5 text-xs text-kelo-muted">Recherchez puis sélectionnez jusqu’à {MAX_GROUP_PARTICIPANTS - 1} personnes.</p>
            </div>
          </div>
          <button type="button" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-kelo-background" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {selected.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-kelo-text">Personnes sélectionnées</p>
                <span className="text-xs font-semibold text-kelo-muted">{totalParticipants} / {MAX_GROUP_PARTICIPANTS}</span>
              </div>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-2xl bg-kelo-background p-3">
                {selected.map((actor) => (
                  <button
                    key={actor.did}
                    type="button"
                    onClick={() => toggleActor(actor)}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-kelo-border bg-white py-1.5 pl-1.5 pr-2 text-left shadow-sm"
                    title="Retirer du groupe"
                  >
                    <Avatar src={actor.avatar} fallback={actor.handle?.[0]?.toUpperCase() || "U"} size="sm" />
                    <span className="max-w-[160px] truncate text-xs font-bold text-kelo-text">{actor.displayName || actor.handle}</span>
                    <X className="h-3.5 w-3.5 text-kelo-muted" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="group-search" className="text-sm font-bold text-kelo-text">Rechercher des comptes</label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />
              <input
                id="group-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nom, handle ou compte AT Protocol..."
                autoComplete="off"
                className="w-full rounded-2xl border border-kelo-border bg-kelo-background py-3 pl-10 pr-4 text-sm outline-none transition focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/20"
              />
            </div>
            <p className="mt-2 text-xs text-kelo-muted">Les résultats proviennent directement de la recherche AT Protocol.</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-kelo-border">
            {searching && <div className="px-4 py-8 text-center text-sm text-kelo-muted">Recherche en cours…</div>}

            {!searching && query.trim() && results.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-kelo-muted">Aucun compte trouvé.</div>
            )}

            {!searching && !query.trim() && (
              <div className="px-4 py-8 text-center text-sm text-kelo-muted">Commencez à écrire pour rechercher des personnes à ajouter.</div>
            )}

            {!searching && results.map((actor) => {
              const isSelected = selectedDids.has(actor.did);
              return (
                <button
                  key={actor.did}
                  type="button"
                  onClick={() => toggleActor(actor)}
                  className={`flex w-full items-center gap-3 border-b border-kelo-border px-4 py-3 text-left transition last:border-b-0 ${isSelected ? "bg-kelo-primary/5" : "hover:bg-kelo-background/60"}`}
                >
                  <Avatar src={actor.avatar} fallback={actor.handle?.[0]?.toUpperCase() || "U"} />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-bold text-kelo-text">{actor.displayName || actor.handle}</span>
                      <AccountBadges actor={actor} identitySize="sm" certificationSize={15} gap="xs" />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-kelo-muted">@{actor.handle}</span>
                    {actor.description && <span className="mt-1 line-clamp-1 block text-xs text-kelo-muted">{actor.description}</span>}
                  </span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-kelo-primary bg-kelo-primary text-white" : "border-kelo-border bg-white text-transparent"}`}>
                    <Check className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-kelo-background px-4 py-3">
            <p className="text-sm font-bold text-kelo-text">{totalParticipants} / {MAX_GROUP_PARTICIPANTS} participants</p>
            <p className="mt-0.5 text-xs text-kelo-muted">Sélectionnez au moins 2 autres personnes. Vous êtes automatiquement inclus dans le groupe.</p>
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={close} className="w-full sm:w-auto">Annuler</Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              loading={creating}
              loadingText="Création..."
              className="w-full px-6 sm:w-auto"
            >
              Créer le groupe ({selected.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
