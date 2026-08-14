"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Globe2,
  Newspaper,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getStoredSession } from "@/services/auth.service";
import type { JournalMedia } from "@/lib/atproto/journal";

const CONTINENTS = [
  "Europe",
  "Afrique",
  "Asie",
  "Amérique du Nord",
  "Amérique du Sud",
  "Océanie",
];

type SearchActor = {
  did: string;
  handle: string;
  displayName: string;
  avatar: string | null;
  certificationStatus?: "certified" | "trusted-verifier" | "none" | null;
  sourceCertificationStatus?: "certified" | "trusted-verifier" | null;
  hiddenOnKelo?: boolean;
  certificationSources?: {
    kelo?: "certified" | "trusted-verifier" | null;
    atproto?: {
      verified?: boolean;
      trustedVerifier?: boolean;
    };
  };
};

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function StatusBadges({ actor }: { actor: SearchActor }) {
  const kelo = actor.certificationSources?.kelo;
  const bluesky = actor.certificationSources?.atproto;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
      {kelo === "trusted-verifier" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-violet-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Certificateur Kelo
        </span>
      )}
      {kelo === "certified" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-violet-700">
          <BadgeCheck className="h-3.5 w-3.5" /> Certifié Kelo
        </span>
      )}
      {bluesky?.trustedVerifier && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Certificateur Bluesky
        </span>
      )}
      {bluesky?.verified && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700">
          <BadgeCheck className="h-3.5 w-3.5" /> Vérifié Bluesky
        </span>
      )}
      {actor.hiddenOnKelo && (
        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
          Certification masquée sur Kelo
        </span>
      )}
      {!kelo && !bluesky?.trustedVerifier && !bluesky?.verified && !actor.hiddenOnKelo && (
        <span className="rounded-full bg-kelo-background px-2 py-1 text-kelo-muted">
          Aucune certification détectée
        </span>
      )}
    </div>
  );
}

export default function AdminJournalPage() {
  const { checked, isAdmin } = useIsAdmin();
  const [handle, setHandle] = useState("");
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchActor[]>([]);
  const [selectedActors, setSelectedActors] = useState<SearchActor[]>([]);
  const [searching, setSearching] = useState(false);
  const [international, setInternational] = useState(false);
  const [continents, setContinents] = useState<string[]>([]);
  const [countries, setCountries] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getStoredSession();
    if (session) setHandle(session.handle);
  }, []);

  const existingHandles = useMemo(
    () => new Set(media.map((item) => normalizeHandle(item.handle))),
    [media]
  );

  const selectedHandles = useMemo(
    () => new Set(selectedActors.map((actor) => normalizeHandle(actor.handle))),
    [selectedActors]
  );

  const loadMedia = async () => {
    try {
      const response = await fetch("/api/journal/media", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger les médias.");
      setMedia(data.media || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger les médias.");
    }
  };

  useEffect(() => {
    if (checked && isAdmin) void loadMedia();
  }, [checked, isAdmin]);

  useEffect(() => {
    const clean = normalizeHandle(query);
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

  const toggleActor = (actor: SearchActor) => {
    const normalized = normalizeHandle(actor.handle);
    if (existingHandles.has(normalized)) return;

    setSelectedActors((current) => {
      const exists = current.some(
        (item) => normalizeHandle(item.handle) === normalized
      );
      if (exists) {
        return current.filter(
          (item) => normalizeHandle(item.handle) !== normalized
        );
      }
      return [...current, actor];
    });
    setMessage("");
  };

  const removeSelectedActor = (actor: SearchActor) => {
    const normalized = normalizeHandle(actor.handle);
    setSelectedActors((current) =>
      current.filter((item) => normalizeHandle(item.handle) !== normalized)
    );
  };

  const toggleContinent = (continent: string) => {
    setContinents((current) =>
      current.includes(continent)
        ? current.filter((item) => item !== continent)
        : [...current, continent]
    );
  };

  const addMediaGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    const session = getStoredSession();
    if (!session || selectedActors.length === 0) return;

    setLoading(true);
    setMessage("");

    const sharedCountries = countries
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const failures: string[] = [];
    let successCount = 0;

    try {
      for (let index = 0; index < selectedActors.length; index += 4) {
        const group = selectedActors.slice(index, index + 4);
        const results = await Promise.all(
          group.map(async (actor) => {
            try {
              const response = await fetch("/api/journal/media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "add",
                  session,
                  handle: actor.handle,
                  international,
                  continents,
                  countries: sharedCountries,
                }),
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(data.error || "Impossible d'ajouter ce média.");
              }
              return { ok: true, handle: actor.handle };
            } catch (error) {
              return {
                ok: false,
                handle: actor.handle,
                error: error instanceof Error ? error.message : "Erreur inconnue",
              };
            }
          })
        );

        for (const result of results) {
          if (result.ok) successCount += 1;
          else failures.push(`@${result.handle}: ${result.error}`);
        }
      }

      await loadMedia();

      if (failures.length === 0) {
        setSelectedActors([]);
        setQuery("");
        setResults([]);
        setInternational(false);
        setContinents([]);
        setCountries("");
        setMessage(
          `${successCount} média${successCount > 1 ? "s" : ""} ajouté${successCount > 1 ? "s" : ""} au Journal avec les mêmes filtres.`
        );
      } else {
        const failedHandles = new Set(
          failures.map((line) => normalizeHandle(line.split(":")[0]))
        );
        setSelectedActors((current) =>
          current.filter((actor) =>
            failedHandles.has(normalizeHandle(actor.handle))
          )
        );
        setMessage(
          `${successCount} média${successCount > 1 ? "s" : ""} ajouté${successCount > 1 ? "s" : ""}. ${failures.length} échec${failures.length > 1 ? "s" : ""} : ${failures.slice(0, 3).join(" · ")}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = async (item: JournalMedia) => {
    const session = getStoredSession();
    if (!session) return;
    setLoading(true);
    try {
      const response = await fetch("/api/journal/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", session, rkey: item.rkey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de retirer ce média.");
      await loadMedia();
      setMessage("Média retiré du Journal.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de retirer ce média.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">
        Vérification des droits…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">
        Accès refusé.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={logout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="border-b border-kelo-border px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Newspaper className="h-6 w-6 text-kelo-primary" />
            <div>
              <h1 className="text-2xl font-extrabold">Médias du Journal</h1>
              <p className="text-sm text-kelo-muted">
                Recherchez et sélectionnez plusieurs comptes AT Protocol, puis appliquez les mêmes filtres à toute la sélection.
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
          <form onSubmit={addMediaGroup} className="space-y-5 rounded-3xl border border-kelo-border p-5">
            <div className="relative">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-bold">Rechercher des médias sur AT Protocol</label>
                <span className="rounded-full bg-kelo-background px-3 py-1 text-xs font-bold text-kelo-muted">
                  {selectedActors.length} sélectionné{selectedActors.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-kelo-border bg-kelo-background px-3">
                <Search className="h-5 w-5 shrink-0 text-kelo-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tapez un nom, un média ou un handle…"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                {searching && <span className="text-xs text-kelo-muted">Recherche…</span>}
              </div>

              {query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-kelo-border bg-white p-2 shadow-xl">
                  {results.length > 0 ? (
                    results.map((actor) => {
                      const normalized = normalizeHandle(actor.handle);
                      const alreadyAdded = existingHandles.has(normalized);
                      const selected = selectedHandles.has(normalized);

                      return (
                        <button
                          type="button"
                          key={actor.did}
                          disabled={alreadyAdded}
                          onClick={() => toggleActor(actor)}
                          className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition disabled:opacity-50 ${
                            selected ? "bg-kelo-background" : "hover:bg-kelo-background"
                          }`}
                        >
                          {actor.avatar ? (
                            <img src={actor.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-kelo-background font-bold">
                              {(actor.displayName || actor.handle).slice(0, 1).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold">{actor.displayName}</p>
                              {alreadyAdded && (
                                <span className="rounded-full bg-kelo-background px-2 py-0.5 text-[10px] font-bold text-kelo-muted">
                                  Déjà ajouté
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-kelo-muted">@{actor.handle}</p>
                            <StatusBadges actor={actor} />
                          </div>

                          {!alreadyAdded && (
                            selected ? (
                              <Check className="mt-1 h-5 w-5 shrink-0 text-kelo-primary" />
                            ) : (
                              <UserPlus className="mt-1 h-4 w-4 shrink-0" />
                            )
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="p-4 text-center text-sm text-kelo-muted">Aucun compte trouvé.</p>
                  )}
                </div>
              )}
            </div>

            {selectedActors.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-kelo-primary/30 bg-kelo-background">
                <div className="flex items-center justify-between gap-3 border-b border-kelo-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-kelo-primary" />
                    <p className="text-sm font-extrabold">Sélection groupée</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedActors([])}
                    className="inline-flex items-center gap-1 text-xs font-bold text-kelo-danger"
                  >
                    <X className="h-3.5 w-3.5" /> Tout retirer
                  </button>
                </div>

                <div className="max-h-80 divide-y divide-kelo-border overflow-y-auto">
                  {selectedActors.map((actor) => (
                    <div key={actor.did} className="flex items-start gap-3 bg-white/70 p-4">
                      {actor.avatar ? (
                        <img src={actor.avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white font-bold">
                          {(actor.displayName || actor.handle).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold">{actor.displayName}</p>
                        <p className="truncate text-xs text-kelo-muted">@{actor.handle}</p>
                        <StatusBadges actor={actor} />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedActor(actor)}
                        aria-label={`Retirer @${actor.handle} de la sélection`}
                        className="rounded-full p-2 text-kelo-danger hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="rounded-2xl border border-dashed border-kelo-border bg-kelo-background/50 p-4">
              <p className="text-sm font-extrabold">Filtres communs à toute la sélection</p>
              <p className="mt-1 text-xs text-kelo-muted">
                Monde, continents et pays choisis ci-dessous seront appliqués à chacun des {selectedActors.length || "médias"} sélectionnés.
              </p>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-kelo-border p-4">
              <input
                type="checkbox"
                checked={international}
                onChange={(event) => setInternational(event.target.checked)}
                className="h-5 w-5 accent-kelo-primary"
              />
              <Globe2 className="h-5 w-5 text-kelo-primary" />
              <div>
                <p className="font-bold">International / Monde</p>
                <p className="text-xs text-kelo-muted">Tous les médias sélectionnés apparaîtront avec le filtre Monde.</p>
              </div>
            </label>

            <div>
              <p className="text-sm font-bold">Continents</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONTINENTS.map((continent) => (
                  <button
                    key={continent}
                    type="button"
                    onClick={() => toggleContinent(continent)}
                    className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                      continents.includes(continent)
                        ? "border-kelo-primary bg-kelo-primary text-white"
                        : "border-kelo-border bg-white"
                    }`}
                  >
                    {continent}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold">Pays</label>
              <input
                value={countries}
                onChange={(event) => setCountries(event.target.value)}
                placeholder="France, Belgique, Espagne…"
                className="mt-2 w-full rounded-2xl border border-kelo-border bg-kelo-background px-4 py-3 outline-none focus:border-kelo-primary"
              />
              <p className="mt-1 text-xs text-kelo-muted">
                Séparez plusieurs pays par une virgule. La même liste sera appliquée à tous les médias sélectionnés.
              </p>
            </div>

            <button
              disabled={loading || selectedActors.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Ajouter {selectedActors.length > 0 ? `${selectedActors.length} média${selectedActors.length > 1 ? "s" : ""}` : "la sélection"} au Journal
            </button>
          </form>

          {message && (
            <p className="rounded-2xl bg-kelo-background p-4 text-sm text-kelo-muted">{message}</p>
          )}

          <section className="overflow-hidden rounded-3xl border border-kelo-border">
            <div className="border-b border-kelo-border px-5 py-4 font-extrabold">
              Médias ajoutés ({media.length})
            </div>

            {media.length === 0 ? (
              <p className="p-8 text-center text-sm text-kelo-muted">Aucun média ajouté pour le moment.</p>
            ) : (
              <div className="divide-y divide-kelo-border">
                {media.map((item) => (
                  <div
                    key={item.rkey}
                    className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-bold">
                        {item.displayName}{" "}
                        <span className="font-normal text-kelo-muted">@{item.handle}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {item.international && (
                          <span className="rounded-full bg-kelo-background px-2 py-1">🌍 Monde</span>
                        )}
                        {item.continents.map((value) => (
                          <span key={value} className="rounded-full bg-kelo-background px-2 py-1">
                            {value}
                          </span>
                        ))}
                        {item.countries.map((value) => (
                          <span key={value} className="rounded-full bg-kelo-background px-2 py-1">
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void removeMedia(item)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-red-200 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-50 sm:self-auto"
                    >
                      <Trash2 className="h-4 w-4" /> Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
