"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pin, Trash2, Plus, Compass, Home } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  getSavedFeedItems,
  getFeedGenerators,
  getPopularFeeds,
  saveFeed,
  removeFeed,
  togglePinFeed,
} from "@/lib/atproto/feeds";
import { KELO_CURATED_LISTS, getListInfo } from "@/lib/atproto/lists";

export default function FeedsPage() {
  const { checked, handle } = useRequireAuth();
  const [savedFeeds, setSavedFeeds] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [curatedLists, setCuratedLists] = useState<any[]>([]);
  const [loadingCurated, setLoadingCurated] = useState(true);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverFeeds, setDiscoverFeeds] = useState<any[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(true);
  const [savingUri, setSavingUri] = useState<string | null>(null);

  const savedUris = new Set(savedFeeds.map((f) => f.uri));

  async function loadSaved() {
    setLoadingSaved(true);
    try {
      const items = await getSavedFeedItems();
      const feedItems = items.filter((i) => i.type === "feed");
      const generators = await getFeedGenerators(feedItems.map((i) => i.value));
      const withPin = generators.map((g: any) => ({
        ...g,
        pinned: feedItems.find((i) => i.value === g.uri)?.pinned ?? false,
      }));
      setSavedFeeds(withPin);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSaved(false);
    }
  }

  async function loadCurated() {
    setLoadingCurated(true);
    try {
      const lists = await Promise.all(
        KELO_CURATED_LISTS.map(async (l) => {
          try {
            return await getListInfo(l.uri);
          } catch (err) {
            console.error(`Impossible de charger la liste ${l.label}`, err);
            return null;
          }
        })
      );
      setCuratedLists(lists.filter(Boolean));
    } finally {
      setLoadingCurated(false);
    }
  }

  async function loadDiscover(query?: string) {
    setLoadingDiscover(true);
    try {
      const feeds = await getPopularFeeds(query, 20);
      setDiscoverFeeds(feeds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDiscover(false);
    }
  }

  useEffect(() => {
    if (!checked) return;
    loadSaved();
    loadCurated();
    loadDiscover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked]);

  useEffect(() => {
    if (!checked) return;
    const timeout = setTimeout(() => loadDiscover(discoverQuery.trim() || undefined), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverQuery]);

  const handleTogglePin = async (uri: string) => {
    setSavedFeeds((prev) => prev.map((f) => (f.uri === uri ? { ...f, pinned: !f.pinned } : f)));
    try {
      await togglePinFeed(uri);
    } catch (err) {
      console.error(err);
      loadSaved();
    }
  };

  const handleRemove = async (uri: string) => {
    setSavedFeeds((prev) => prev.filter((f) => f.uri !== uri));
    try {
      await removeFeed(uri);
    } catch (err) {
      console.error(err);
      loadSaved();
    }
  };

  const handleSave = async (uri: string) => {
    setSavingUri(uri);
    try {
      await saveFeed(uri);
      await loadSaved();
    } catch (err) {
      console.error(err);
      alert("Impossible d'enregistrer ce fil.");
    } finally {
      setSavingUri(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification de votre session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
        <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 p-4 backdrop-blur-md">
          <h2 className="text-xl font-extrabold text-kelo-text">Fils d'actu</h2>
        </div>

        {/* Mes fils d'actu */}
        <section className="border-b border-kelo-border p-4">
          <h3 className="mb-3 text-sm font-extrabold text-kelo-text">Mes fils d'actu</h3>

          <div className="flex flex-col gap-1">
            <Link
              href="/feed"
              className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-kelo-background"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-kelo-gradient">
                <Home className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-kelo-text">Pour vous</p>
                <p className="text-xs text-kelo-muted">Vos abonnements</p>
              </div>
            </Link>

            <Link
              href="/feed"
              className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-kelo-background"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-kelo-gradient">
                <Compass className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-kelo-text">Découvrir</p>
                <p className="text-xs text-kelo-muted">Tout le réseau fédéré</p>
              </div>
            </Link>
          </div>

          {!loadingCurated && curatedLists.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {curatedLists.map((list: any) => (
                <Link
                  key={list.uri}
                  href={`/feeds/list?uri=${encodeURIComponent(list.uri)}`}
                  className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-kelo-background"
                >
                  {list.avatar ? (
                    <img src={list.avatar} alt="" className="h-10 w-10 flex-shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient text-sm font-bold text-white">
                      K
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-kelo-text">{list.name}</p>
                    <p className="truncate text-xs text-kelo-muted">
                      {list.listItemCount ?? 0} membre{(list.listItemCount ?? 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {loadingSaved ? (
            <p className="py-4 text-center text-sm text-kelo-muted">Chargement...</p>
          ) : savedFeeds.length > 0 ? (
            <div className="mt-1 flex flex-col gap-1">
              {savedFeeds.map((feed) => (
                <div key={feed.uri} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-kelo-background">
                  <Link href={`/feeds/view?uri=${encodeURIComponent(feed.uri)}`} className="flex flex-grow items-center gap-3 min-w-0">
                    {feed.avatar ? (
                      <img src={feed.avatar} alt="" className="h-10 w-10 flex-shrink-0 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-background text-sm font-bold text-kelo-muted">
                        #
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-kelo-text">{feed.displayName}</p>
                      <p className="truncate text-xs text-kelo-muted">par @{feed.creator?.handle}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleTogglePin(feed.uri)}
                    className={`flex-shrink-0 rounded-lg p-2 transition-colors ${
                      feed.pinned ? "text-kelo-primary" : "text-kelo-muted hover:text-kelo-primary"
                    }`}
                    title={feed.pinned ? "Désépingler" : "Épingler"}
                  >
                    <Pin className="h-4 w-4" fill={feed.pinned ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => handleRemove(feed.uri)}
                    className="flex-shrink-0 rounded-lg p-2 text-kelo-muted transition-colors hover:text-kelo-danger"
                    title="Retirer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-kelo-muted">
              Aucun fil personnalisé enregistré pour l'instant.
            </p>
          )}
        </section>

        {/* Découvrir de nouveaux fils d'actu */}
        <section className="p-4">
          <h3 className="mb-1 text-sm font-extrabold text-kelo-text">Découvrir de nouveaux fils d'actu</h3>
          <p className="mb-3 text-xs text-kelo-muted">
            Explorez les fils algorithmiques publiés sur tout le réseau fédéré (Bluesky, WSocial, Eurosky, Kelo
            Social...).
          </p>

          <input
            type="text"
            value={discoverQuery}
            onChange={(e) => setDiscoverQuery(e.target.value)}
            placeholder="🔍 Rechercher des fils d'actu..."
            className="mb-3 w-full rounded-full bg-kelo-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
          />

          {loadingDiscover ? (
            <p className="py-4 text-center text-sm text-kelo-muted">Chargement...</p>
          ) : discoverFeeds.length > 0 ? (
            <div className="flex flex-col gap-1">
              {discoverFeeds.map((feed: any) => (
                <div key={feed.uri} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-kelo-background">
                  <Link
                    href={`/feeds/view?uri=${encodeURIComponent(feed.uri)}`}
                    className="flex min-w-0 flex-grow items-center gap-3"
                  >
                    {feed.avatar ? (
                      <img src={feed.avatar} alt="" className="h-10 w-10 flex-shrink-0 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-background text-sm font-bold text-kelo-muted">
                        #
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-kelo-text">{feed.displayName}</p>
                      {feed.description && <p className="truncate text-xs text-kelo-muted">{feed.description}</p>}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleSave(feed.uri)}
                    disabled={savedUris.has(feed.uri) || savingUri === feed.uri}
                    className="flex-shrink-0 rounded-full bg-kelo-gradient p-2 text-white transition hover:opacity-90 disabled:opacity-40"
                    title={savedUris.has(feed.uri) ? "Déjà enregistré" : "Enregistrer"}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-kelo-muted">Aucun fil trouvé.</p>
          )}
        </section>
      </main>
    </div>
  );
}
