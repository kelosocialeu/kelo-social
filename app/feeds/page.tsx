"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Pin,
  Trash2,
  Plus,
  Compass,
  Home,
  Search,
  Newspaper,
} from "lucide-react";
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
import {
  KELO_CURATED_LISTS,
  getListInfo,
} from "@/lib/atproto/lists";

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

  const savedUris = useMemo(
    () => new Set(savedFeeds.map((feed) => feed.uri)),
    [savedFeeds]
  );

  async function loadSaved() {
    setLoadingSaved(true);

    try {
      const items = await getSavedFeedItems();
      const feedItems = items.filter((item) => item.type === "feed");
      const generators = await getFeedGenerators(
        feedItems.map((item) => item.value)
      );

      setSavedFeeds(
        generators.map((generator: any) => ({
          ...generator,
          pinned:
            feedItems.find((item) => item.value === generator.uri)
              ?.pinned ?? false,
        }))
      );
    } catch (error) {
      console.error("Impossible de charger les fils enregistrés :", error);
    } finally {
      setLoadingSaved(false);
    }
  }

  async function loadCurated() {
    setLoadingCurated(true);

    try {
      const lists = await Promise.all(
        KELO_CURATED_LISTS.map(async (list) => {
          try {
            return await getListInfo(list.uri);
          } catch (error) {
            console.error(
              `Impossible de charger la liste ${list.label}`,
              error
            );
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
    } catch (error) {
      console.error("Impossible de charger les fils à découvrir :", error);
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

    const timeout = setTimeout(() => {
      loadDiscover(discoverQuery.trim() || undefined);
    }, 400);

    return () => clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverQuery, checked]);

  const handleTogglePin = async (uri: string) => {
    setSavedFeeds((previousFeeds) =>
      previousFeeds.map((feed) =>
        feed.uri === uri ? { ...feed, pinned: !feed.pinned } : feed
      )
    );

    try {
      await togglePinFeed(uri);
    } catch (error) {
      console.error(error);
      await loadSaved();
    }
  };

  const handleRemove = async (uri: string) => {
    setSavedFeeds((previousFeeds) =>
      previousFeeds.filter((feed) => feed.uri !== uri)
    );

    try {
      await removeFeed(uri);
    } catch (error) {
      console.error(error);
      await loadSaved();
    }
  };

  const handleSave = async (uri: string) => {
    setSavingUri(uri);

    try {
      await saveFeed(uri);
      await loadSaved();
    } catch (error) {
      console.error(error);
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

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 backdrop-blur-md">
          <div className="px-4 py-4 sm:px-5 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">
                  Fils d&apos;actu
                </h1>
                <p className="mt-1 text-xs text-kelo-muted sm:text-sm">
                  Organisez vos fils et découvrez de nouveaux contenus fédérés.
                </p>
              </div>

              <span className="rounded-full bg-kelo-background px-3 py-1 text-xs font-semibold text-kelo-muted">
                {savedFeeds.length} enregistré{savedFeeds.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </header>

        <div className="space-y-6 px-4 py-5 sm:px-5 lg:px-6">
          <section>
            <div className="mb-3">
              <h2 className="text-base font-extrabold text-kelo-text">
                Mes fils d&apos;actu
              </h2>
              <p className="mt-1 text-xs text-kelo-muted">
                Accédez rapidement à vos fils principaux et enregistrés.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <Link
                href="/feed"
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border bg-white p-4 transition hover:-translate-y-0.5 hover:bg-kelo-background/60 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-kelo-text">Pour vous</p>
                  <p className="truncate text-xs text-kelo-muted">Vos abonnements</p>
                </div>
              </Link>

              <Link
                href="/feed"
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border bg-white p-4 transition hover:-translate-y-0.5 hover:bg-kelo-background/60 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient">
                  <Compass className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-kelo-text">Découvrir</p>
                  <p className="truncate text-xs text-kelo-muted">Tout le réseau fédéré</p>
                </div>
              </Link>

              {!loadingCurated &&
                curatedLists.map((list: any) => (
                  <Link
                    key={list.uri}
                    href={`/feeds/list?uri=${encodeURIComponent(list.uri)}`}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border bg-white p-4 transition hover:-translate-y-0.5 hover:bg-kelo-background/60 hover:shadow-sm"
                  >
                    {list.avatar ? (
                      <img
                        src={list.avatar}
                        alt=""
                        className="h-11 w-11 flex-shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient text-sm font-bold text-white">
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

            {loadingCurated && (
              <p className="py-4 text-center text-sm text-kelo-muted">Chargement des listes...</p>
            )}

            <div className="mt-4">
              {loadingSaved ? (
                <p className="py-4 text-center text-sm text-kelo-muted">Chargement...</p>
              ) : savedFeeds.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {savedFeeds.map((feed) => (
                    <div
                      key={feed.uri}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border bg-white p-4 transition hover:-translate-y-0.5 hover:bg-kelo-background/60 hover:shadow-sm"
                    >
                      <Link
                        href={`/feeds/view?uri=${encodeURIComponent(feed.uri)}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        {feed.avatar ? (
                          <img
                            src={feed.avatar}
                            alt=""
                            className="h-11 w-11 flex-shrink-0 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-background text-sm font-bold text-kelo-muted">#</div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-kelo-text">{feed.displayName}</p>
                          <p className="truncate text-xs text-kelo-muted">par @{feed.creator?.handle}</p>
                        </div>
                      </Link>

                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(feed.uri)}
                          className={`rounded-lg p-2 transition-colors ${
                            feed.pinned
                              ? "bg-kelo-background text-kelo-primary"
                              : "text-kelo-muted hover:bg-kelo-background hover:text-kelo-primary"
                          }`}
                          title={feed.pinned ? "Désépingler" : "Épingler"}
                        >
                          <Pin className="h-4 w-4" fill={feed.pinned ? "currentColor" : "none"} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemove(feed.uri)}
                          className="rounded-lg p-2 text-kelo-muted transition-colors hover:bg-kelo-background hover:text-kelo-danger"
                          title="Retirer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-kelo-border bg-kelo-background/40 px-6 py-8 text-center">
                  <Newspaper className="mx-auto h-8 w-8 text-kelo-muted" />
                  <p className="mt-3 text-sm font-bold text-kelo-text">Aucun fil personnalisé</p>
                  <p className="mt-1 text-xs text-kelo-muted">Les fils que vous enregistrez apparaîtront ici.</p>
                </div>
              )}
            </div>
          </section>

          <section className="border-t border-kelo-border pt-6">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-kelo-text">
                Découvrir de nouveaux fils d&apos;actu
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-kelo-muted">
                Explorez les fils algorithmiques publiés sur le réseau fédéré.
              </p>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />
              <input
                type="text"
                value={discoverQuery}
                onChange={(event) => setDiscoverQuery(event.target.value)}
                placeholder="Rechercher des fils d'actu..."
                className="w-full rounded-full bg-kelo-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
              />
            </div>

            {loadingDiscover ? (
              <p className="py-6 text-center text-sm text-kelo-muted">Chargement...</p>
            ) : discoverFeeds.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {discoverFeeds.map((feed: any) => (
                  <div
                    key={feed.uri}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border bg-white p-4 transition hover:-translate-y-0.5 hover:bg-kelo-background/60 hover:shadow-sm"
                  >
                    <Link
                      href={`/feeds/view?uri=${encodeURIComponent(feed.uri)}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      {feed.avatar ? (
                        <img
                          src={feed.avatar}
                          alt=""
                          className="h-11 w-11 flex-shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-background text-sm font-bold text-kelo-muted">#</div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-kelo-text">{feed.displayName}</p>
                        {feed.description && (
                          <p className="line-clamp-2 text-xs text-kelo-muted">{feed.description}</p>
                        )}
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleSave(feed.uri)}
                      disabled={savedUris.has(feed.uri) || savingUri === feed.uri}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-kelo-gradient text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      title={savedUris.has(feed.uri) ? "Déjà enregistré" : "Enregistrer"}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-kelo-border bg-kelo-background/40 px-6 py-8 text-center">
                <Search className="mx-auto h-8 w-8 text-kelo-muted" />
                <p className="mt-3 text-sm font-bold text-kelo-text">Aucun fil trouvé</p>
                <p className="mt-1 text-xs text-kelo-muted">Essayez une autre recherche.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
