"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, Globe2, Newspaper, RefreshCw, X } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import PostCard from "@/components/feed/PostCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { getJournalMedia, getJournalPosts, type JournalMedia, type JournalPost } from "@/lib/atproto/journal";

type FilterValue = { type: "world" | "continent" | "country"; value: string };

export default function JournalPage() {
  const { checked, handle } = useRequireAuth();
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [filters, setFilters] = useState<FilterValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadJournal = async () => {
    setLoading(true);
    setError("");
    try {
      const nextMedia = await getJournalMedia();
      setMedia(nextMedia);
      setPosts(await getJournalPosts(nextMedia, 12));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger le Journal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (checked) void loadJournal();
  }, [checked]);

  const continents = useMemo(
    () => Array.from(new Set(media.flatMap((item) => item.continents))).sort((a, b) => a.localeCompare(b, "fr")),
    [media]
  );
  const countries = useMemo(
    () => Array.from(new Set(media.flatMap((item) => item.countries))).sort((a, b) => a.localeCompare(b, "fr")),
    [media]
  );
  const hasWorld = useMemo(() => media.some((item) => item.international), [media]);

  const matchesFilters = (item: JournalMedia) => {
    if (filters.length === 0) return true;
    return filters.some((filter) => {
      if (filter.type === "world") return item.international;
      if (filter.type === "continent") return item.continents.includes(filter.value);
      return item.countries.includes(filter.value);
    });
  };

  const visiblePosts = useMemo(
    () => posts.filter((entry) => matchesFilters(entry.media)),
    [posts, filters]
  );

  const toggleFilter = (filter: FilterValue) => {
    setFilters((current) => {
      const exists = current.some((item) => item.type === filter.type && item.value === filter.value);
      return exists
        ? current.filter((item) => !(item.type === filter.type && item.value === filter.value))
        : [...current, filter];
    });
  };

  const isSelected = (type: FilterValue["type"], value: string) =>
    filters.some((item) => item.type === type && item.value === value);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">Vérification de votre session...</div>;
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-10 border-b border-kelo-border bg-white/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5 lg:px-6">
            <div className="flex items-center gap-3">
              <Newspaper className="h-6 w-6 text-kelo-primary" />
              <div>
                <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">Journal</h1>
                <p className="text-xs text-kelo-muted sm:text-sm">L'actualité publiée par les médias sélectionnés par Kelo Social.</p>
              </div>
            </div>
            <button type="button" onClick={() => void loadJournal()} disabled={loading} className="rounded-full p-2.5 hover:bg-kelo-background disabled:opacity-50" aria-label="Actualiser le Journal">
              <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {media.length > 0 && (
            <div className="border-t border-kelo-border px-4 py-3 sm:px-5 lg:px-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-kelo-muted"><Filter className="h-4 w-4" /> Filtres</span>
                {filters.length > 0 && (
                  <button type="button" onClick={() => setFilters([])} className="inline-flex items-center gap-1 text-xs font-bold text-kelo-primary"><X className="h-3.5 w-3.5" /> Tout effacer</button>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <button type="button" onClick={() => setFilters([])} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${filters.length === 0 ? "border-kelo-primary bg-kelo-primary text-white" : "border-kelo-border"}`}>Tout</button>
                {hasWorld && (
                  <button type="button" onClick={() => toggleFilter({ type: "world", value: "Monde" })} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${isSelected("world", "Monde") ? "border-kelo-primary bg-kelo-primary text-white" : "border-kelo-border"}`}>
                    <Globe2 className="h-4 w-4" /> Monde
                  </button>
                )}
                {continents.map((continent) => (
                  <button key={`continent-${continent}`} type="button" onClick={() => toggleFilter({ type: "continent", value: continent })} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${isSelected("continent", continent) ? "border-kelo-primary bg-kelo-primary text-white" : "border-kelo-border"}`}>{continent}</button>
                ))}
                {countries.map((country) => (
                  <button key={`country-${country}`} type="button" onClick={() => toggleFilter({ type: "country", value: country })} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${isSelected("country", country) ? "border-kelo-primary bg-kelo-primary text-white" : "border-kelo-border"}`}>{country}</button>
                ))}
              </div>
            </div>
          )}
        </header>

        {error && <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading && posts.length === 0 ? (
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-kelo-muted">Chargement du Journal…</div>
        ) : media.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
            <div className="max-w-md">
              <Newspaper className="mx-auto h-10 w-10 text-kelo-muted" />
              <h2 className="mt-4 text-lg font-bold">Le Journal se prépare</h2>
              <p className="mt-2 text-sm leading-relaxed text-kelo-muted">Les médias ajoutés par l'équipe Kelo Social apparaîtront ici avec leurs publications.</p>
            </div>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="p-10 text-center text-sm text-kelo-muted">Aucune publication ne correspond aux filtres sélectionnés.</div>
        ) : (
          <div className="divide-y divide-kelo-border">
            {visiblePosts.map((entry) => (
              <div key={`${entry.post.uri}-${entry.media.did}`}>
                <div className="flex flex-wrap items-center gap-1.5 bg-kelo-background/60 px-4 py-2 text-[11px] font-semibold text-kelo-muted sm:px-5 lg:px-6">
                  <span>Journal · {entry.media.displayName}</span>
                  {entry.media.international && <span className="rounded-full bg-white px-2 py-0.5">Monde</span>}
                  {entry.media.continents.map((tag) => <span key={tag} className="rounded-full bg-white px-2 py-0.5">{tag}</span>)}
                  {entry.media.countries.map((tag) => <span key={tag} className="rounded-full bg-white px-2 py-0.5">{tag}</span>)}
                </div>
                <PostCard post={entry.post} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
