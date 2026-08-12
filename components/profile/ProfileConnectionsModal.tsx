"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import {
  getActorFollowers,
  getActorFollows,
} from "@/lib/atproto/profile";

type ConnectionType = "followers" | "following";

interface ProfileConnectionsModalProps {
  actor: string;
  type: ConnectionType;
  open: boolean;
  onClose: () => void;
}

export default function ProfileConnectionsModal({
  actor,
  type,
  open,
  onClose,
}: ProfileConnectionsModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !actor) return;

    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      setError(null);
      setItems([]);
      setCursor(undefined);

      try {
        const response =
          type === "followers"
            ? await getActorFollowers(actor, 50)
            : await getActorFollows(actor, 50);

        if (cancelled) return;
        setItems(response.items);
        setCursor(response.cursor);
      } catch (loadError) {
        console.error("Impossible de charger les abonnements :", loadError);
        if (!cancelled) {
          setError(
            type === "followers"
              ? "Impossible de charger les abonné·e·s."
              : "Impossible de charger les abonnements."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [open, actor, type]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function loadMore() {
    if (!cursor || loadingMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const response =
        type === "followers"
          ? await getActorFollowers(actor, 50, cursor)
          : await getActorFollows(actor, 50, cursor);

      setItems((current) => {
        const known = new Set(current.map((item) => item.did));
        return [
          ...current,
          ...response.items.filter((item) => !known.has(item.did)),
        ];
      });
      setCursor(response.cursor);
    } catch (loadError) {
      console.error("Impossible de charger la suite :", loadError);
      setError("Impossible de charger la suite de la liste.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (!open) return null;

  const title = type === "followers" ? "Abonné·e·s" : "Abonnements";

  return (
    <>
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/25"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[82vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-kelo-border bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-kelo-border px-5 py-4">
          <h2 className="text-lg font-extrabold text-kelo-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-text"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <img
                src="https://kelosocial.sirv.com/logo.png"
                alt="Chargement"
                className="h-10 w-10 animate-spin object-contain"
              />
            </div>
          ) : items.length > 0 ? (
            <div className="divide-y divide-kelo-border">
              {items.map((account) => (
                <Link
                  key={account.did}
                  href={`/profile/${encodeURIComponent(account.handle)}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-kelo-background/60"
                >
                  <Avatar
                    src={account.avatar}
                    fallback={(account.displayName || account.handle || "K")
                      .slice(0, 1)
                      .toUpperCase()}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <p className="truncate text-sm font-extrabold text-kelo-text">
                        {account.displayName || account.handle}
                      </p>
                      <AccountBadges actor={account} certificationSize={17} />
                    </div>
                    <p className="truncate text-xs text-kelo-muted">
                      @{account.handle}
                    </p>
                    {account.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-kelo-muted">
                        {account.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : !error ? (
            <p className="px-5 py-12 text-center text-sm text-kelo-muted">
              {type === "followers"
                ? "Aucun·e abonné·e pour l’instant."
                : "Aucun abonnement pour l’instant."}
            </p>
          ) : null}

          {error && (
            <p className="px-5 py-4 text-center text-sm text-kelo-danger">
              {error}
            </p>
          )}

          {cursor && !loading && (
            <div className="p-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-full bg-kelo-background px-4 py-3 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60 disabled:opacity-50"
              >
                {loadingMore ? "Chargement..." : "Charger plus"}
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
