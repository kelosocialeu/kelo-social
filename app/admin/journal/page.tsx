"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Globe2, Newspaper, Plus, Search, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getStoredSession } from "@/services/auth.service";
import type { JournalMedia } from "@/lib/atproto/journal";

const CONTINENTS = ["Europe", "Afrique", "Asie", "Amérique du Nord", "Amérique du Sud", "Océanie"];

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
        <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Certification masquée sur Kelo</span>
      )}
      {!kelo && !bluesky?.trustedVerifier && !bluesky?.verified && !actor.hiddenOnKelo && (
        <span className="rounded-full bg-kelo-background px-2 py-1 text-kelo-muted">Aucune certification détectée</span>
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
  const [selectedActor, setSelectedActor] = useState<SearchActor | null>(null);
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
    if (clean.length < 2 || selectedActor) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/admin/account-search?q=${encodeURIComponent(clean)}`, {
          cache: "no-store",
        });
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
  }, [query, selectedActor]);

  const selectActor = (actor: SearchActor) => {
    setSelectedActor(actor);
    setQuery(actor.handle);
    setResults([]);
    setMessage("");
  };

  const clearSelectedActor = () => {
    setSelectedActor(null);
    setQuery("");
    setResults([]);
  };

  const toggleContinent = (continent: string) => {
    setContinents((current) =>
      current.includes(continent) ? current.filter((item) => item !== continent) : [...current, continent]
    );
  };

  const addMedia = async (event: React.FormEvent) => {
    event.preventDefault();
    const session = getStoredSession();
    if (!session || !selectedActor) return;

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/journal/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          session,
          handle: selectedActor.handle,
          international,
          continents,
          countries: countries.split(",").map((value) => value.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d'ajouter ce média.");
      clearSelectedActor();
      setInternational(false);
      setContinents([]);
      setCountries("");
      setMessage("Média ajouté au Journal.");
      await loadMedia();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'ajouter ce média.");
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

  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">Vérification des droits…</div>;
  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">Accès refusé.</div>;

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={logout} />
      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="border-b border-kelo-border px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Newspaper className="h-6 w-6 text-kelo-primary" />
            <div>
              <h1 className="text-2xl font-extrabold">Médias du Journal</h1>
              <p className="text-sm text-kelo-muted">Recherchez les comptes AT Protocol puis définissez les zones dans lesquelles ils apparaissent.</p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
          <form onSubmit={addMedia} className="space-y-5 rounded-3xl border border-kelo-border p-5">
            <div className="relative">
              <label className="text-sm font-bold">Rechercher un média sur AT Protocol</label>
              <div className="mt-2 flex min-h-12 items-center gap-2 rounded-2xl border border-kelo-border bg-kelo-background px-3">
                <Search className="h-5 w-5 shrink-0 text-kelo-muted" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (selectedActor && normalizeHandle(e.target.value) !== normalizeHandle(selectedActor.handle)) {
                      setSelectedActor(null);
                    }
                  }}
                  placeholder="Tapez un nom, un média ou un handle…"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                {searching && <span className="text-xs text-kelo-muted">Recherche…</span>}
              </div>

              {!selectedActor && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-kelo-border bg-white p-2 shadow-xl">
                  {results.length > 0 ? results.map((actor) => {
                    const alreadyAdded = existingHandles.has(normalizeHandle(actor.handle));
                    return (
                      <button
                        type="button"
                        key={actor.did}
                        disabled={alreadyAdded}
                        onClick={() => selectActor(actor)}
                        className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition hover:bg-kelo-background disabled:opacity-50"
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
                            {alreadyAdded && <span className="rounded-full bg-kelo-background px-2 py-0.5 text-[10px] font-bold text-kelo-muted">Déjà ajouté</span>}
                          </div>
                          <p className="truncate text-xs text-kelo-muted">@{actor.handle}</p>
                          <StatusBadges actor={actor} />
                        </div>
                        {!alreadyAdded && <UserPlus className="mt-1 h-4 w-4 shrink-0" />}
                      </button>
                    );
                  }) : (
                    <p className="p-4 text-center text-sm text-kelo-muted">Aucun compte trouvé.</p>
                  )}
                </div>
              )}
            </div>

            {selectedActor && (
              <div className="rounded-2xl border border-kelo-primary/30 bg-kelo-background p-4">
                <div className="flex items-start gap-3">
                  {selectedActor.avatar ? (
                    <img src={selectedActor.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-bold">
                      {(selectedActor.displayName || selectedActor.handle).slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{selectedActor.displayName}</p>
                    <p className="truncate text-sm text-kelo-muted">@{selectedActor.handle}</p>
                    <StatusBadges actor={selectedActor} />
                  </div>
                  <button type="button" onClick={clearSelectedActor} className="text-xs font-bold text-kelo-danger">Changer</button>
                </div>
              </div>
            )}

            <label className="flex items-center gap-3 rounded-2xl border border-kelo-border p-4">
              <input type="checkbox" checked={international} onChange={(e) => setInternational(e.target.checked)} className="h-5 w-5 accent-kelo-primary" />
              <Globe2 className="h-5 w-5 text-kelo-primary" />
              <div><p className="font-bold">International / Monde</p><p className="text-xs text-kelo-muted">Le média apparaîtra quand l'utilisateur sélectionne Monde.</p></div>
            </label>

            <div>
              <p className="text-sm font-bold">Continents</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONTINENTS.map((continent) => (
                  <button key={continent} type="button" onClick={() => toggleContinent(continent)} className={`rounded-full border px-3 py-2 text-sm font-semibold ${continents.includes(continent) ? "border-kelo-primary bg-kelo-primary text-white" : "border-kelo-border bg-white"}`}>
                    {continent}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold">Pays</label>
              <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="France, Belgique, Espagne…" className="mt-2 w-full rounded-2xl border border-kelo-border bg-kelo-background px-4 py-3 outline-none focus:border-kelo-primary" />
              <p className="mt-1 text-xs text-kelo-muted">Séparez plusieurs pays par une virgule. Un même média peut être International et rattaché à plusieurs pays.</p>
            </div>

            <button disabled={loading || !selectedActor} className="inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-5 py-3 font-bold text-white disabled:opacity-50">
              <Plus className="h-4 w-4" /> Ajouter au Journal
            </button>
          </form>

          {message && <p className="rounded-2xl bg-kelo-background p-4 text-sm text-kelo-muted">{message}</p>}

          <section className="overflow-hidden rounded-3xl border border-kelo-border">
            <div className="border-b border-kelo-border px-5 py-4 font-extrabold">Médias ajoutés ({media.length})</div>
            {media.length === 0 ? (
              <p className="p-8 text-center text-sm text-kelo-muted">Aucun média ajouté pour le moment.</p>
            ) : (
              <div className="divide-y divide-kelo-border">
                {media.map((item) => (
                  <div key={item.rkey} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold">{item.displayName} <span className="font-normal text-kelo-muted">@{item.handle}</span></p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {item.international && <span className="rounded-full bg-kelo-background px-2 py-1">🌍 Monde</span>}
                        {item.continents.map((value) => <span key={value} className="rounded-full bg-kelo-background px-2 py-1">{value}</span>)}
                        {item.countries.map((value) => <span key={value} className="rounded-full bg-kelo-background px-2 py-1">{value}</span>)}
                      </div>
                    </div>
                    <button type="button" onClick={() => void removeMedia(item)} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-full border border-red-200 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-50 sm:self-auto">
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
