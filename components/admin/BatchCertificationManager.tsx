"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, Trash2, UserPlus, Users } from "lucide-react";

import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { getStoredSession } from "@/services/auth.service";

type CertificationStatus = "certified" | "trusted-verifier" | "none";

type Actor = {
  did: string;
  handle: string;
  displayName: string;
  avatar: string | null;
};

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

export default function BatchCertificationManager({
  onUpdated,
}: {
  onUpdated?: () => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Actor[]>([]);
  const [selected, setSelected] = useState<Actor[]>([]);
  const [status, setStatus] = useState<CertificationStatus>("certified");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedHandles = useMemo(
    () => new Set(selected.map((actor) => normalizeHandle(actor.handle))),
    [selected]
  );

  useEffect(() => {
    const clean = normalizeHandle(query);
    setMessage("");

    if (clean.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/admin/account-search?q=${encodeURIComponent(clean)}`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!cancelled) setResults(Array.isArray(data.actors) ? data.actors : []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function addActor(actor: Actor) {
    const handle = normalizeHandle(actor.handle);
    if (!handle || selectedHandles.has(handle)) return;
    setSelected((current) => [...current, { ...actor, handle }]);
    setQuery("");
    setResults([]);
    setError("");
  }

  function addManualHandle() {
    const handle = normalizeHandle(query);
    if (!handle || selectedHandles.has(handle)) return;
    addActor({ did: `pending:${handle}`, handle, displayName: handle, avatar: null });
  }

  function removeActor(handle: string) {
    const normalized = normalizeHandle(handle);
    setSelected((current) =>
      current.filter((actor) => normalizeHandle(actor.handle) !== normalized)
    );
  }

  async function applyToAll() {
    if (selected.length === 0) return;

    const session = getStoredSession();
    if (!session) {
      setError("Session administrateur introuvable. Reconnectez-vous.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    const failures: string[] = [];
    let successCount = 0;

    for (let index = 0; index < selected.length; index += 4) {
      const group = selected.slice(index, index + 4);
      const groupResults = await Promise.all(
        group.map(async (actor) => {
          try {
            const response = await fetch("/api/admin/certify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                session,
                targetHandle: normalizeHandle(actor.handle),
                status,
              }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(data.error || "Échec de la mise à jour");
            }
            return { ok: true, handle: actor.handle };
          } catch (requestError) {
            return {
              ok: false,
              handle: actor.handle,
              error:
                requestError instanceof Error
                  ? requestError.message
                  : "Erreur inconnue",
            };
          }
        })
      );

      for (const result of groupResults) {
        if (result.ok) successCount += 1;
        else failures.push(`@${result.handle}: ${result.error}`);
      }
    }

    if (successCount > 0) {
      setMessage(
        `${successCount} compte${successCount > 1 ? "s" : ""} mis à jour avec succès.`
      );
      if (failures.length === 0) setSelected([]);
      else {
        const failedHandles = new Set(
          failures.map((line) => normalizeHandle(line.split(":")[0]))
        );
        setSelected((current) =>
          current.filter((actor) => failedHandles.has(`@${normalizeHandle(actor.handle)}`))
        );
      }
      await onUpdated?.();
    }

    if (failures.length > 0) {
      setError(
        `${failures.length} compte${failures.length > 1 ? "s" : ""} n'ont pas pu être mis à jour. ${failures.slice(0, 3).join(" · ")}`
      );
    }

    setSubmitting(false);
  }

  return (
    <section className="rounded-3xl border border-kelo-border bg-kelo-background p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-kelo-primary" />
            <h2 className="text-lg font-extrabold text-kelo-text">
              Certification en lot
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-kelo-muted">
            Recherchez des comptes AT Protocol, ajoutez-les à la liste puis appliquez la même certification à toute la sélection en une fois.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-kelo-muted">
          {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative mt-5">
        <label className="mb-2 block text-sm font-bold text-kelo-text">
          Rechercher un compte
        </label>
        <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-kelo-border bg-white px-3">
          <Search className="h-5 w-5 shrink-0 text-kelo-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (results[0]) addActor(results[0]);
                else addManualHandle();
              }
            }}
            placeholder="Tapez un nom, un handle ou quelques lettres…"
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {searching && <span className="text-xs text-kelo-muted">Recherche…</span>}
        </div>

        {query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-kelo-border bg-white p-2 shadow-xl">
            {results.map((actor) => {
              const alreadySelected = selectedHandles.has(normalizeHandle(actor.handle));
              return (
                <button
                  type="button"
                  key={actor.did}
                  disabled={alreadySelected}
                  onClick={() => addActor(actor)}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-kelo-background disabled:opacity-50"
                >
                  {actor.avatar ? (
                    <img src={actor.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kelo-background font-bold">
                      {(actor.displayName || actor.handle).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{actor.displayName}</p>
                    <p className="truncate text-xs text-kelo-muted">@{actor.handle}</p>
                  </div>
                  {alreadySelected ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </button>
              );
            })}

            <button
              type="button"
              onClick={addManualHandle}
              className="mt-1 flex w-full items-center gap-3 rounded-xl border border-dashed border-kelo-border p-3 text-left text-sm font-bold hover:bg-kelo-background"
            >
              <UserPlus className="h-4 w-4" />
              Ajouter manuellement @{normalizeHandle(query)}
            </button>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-kelo-border bg-white">
          <div className="flex items-center justify-between border-b border-kelo-border px-4 py-3">
            <p className="text-sm font-extrabold">Comptes sélectionnés</p>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs font-bold text-kelo-danger"
            >
              Tout retirer
            </button>
          </div>
          <div className="max-h-80 divide-y divide-kelo-border overflow-y-auto">
            {selected.map((actor) => (
              <div key={actor.handle} className="flex items-center gap-3 p-3 sm:p-4">
                {actor.avatar ? (
                  <img src={actor.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kelo-background font-bold">
                    {(actor.displayName || actor.handle).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{actor.displayName}</p>
                  <p className="truncate text-xs text-kelo-muted">@{actor.handle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeActor(actor.handle)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-kelo-danger hover:bg-red-50"
                  aria-label={`Retirer @${actor.handle}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <Select
          label="Certification à appliquer"
          value={status}
          onChange={(event) => setStatus(event.target.value as CertificationStatus)}
        >
          <option value="certified">Compte certifié</option>
          <option value="trusted-verifier">Certificateur de confiance</option>
          <option value="none">Révoquer la certification</option>
        </Select>
        <Button
          type="button"
          onClick={applyToAll}
          disabled={selected.length === 0 || submitting}
          loading={submitting}
          loadingText={`Mise à jour de ${selected.length} compte${selected.length > 1 ? "s" : ""}…`}
          className="min-w-[240px]"
        >
          Mettre à jour {selected.length > 0 ? `(${selected.length})` : "la sélection"}
        </Button>
      </div>

      {message && <p className="mt-4 text-sm font-bold text-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm font-medium text-kelo-danger">{error}</p>}
    </section>
  );
}
