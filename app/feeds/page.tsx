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
  List,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import {
  getSavedFeedItems,
  getFeedGenerators,
  getListsMetadata,
  getPopularFeeds,
  saveFeed,
  saveList,
  removeFeed,
  removeList,
  togglePinFeed,
  togglePinList,
  SavedFeedItem,
} from "@/lib/atproto/feeds";
import {
  KELO_CURATED_LISTS,
  getListInfo,
} from "@/lib/atproto/lists";

export default function FeedsPage() {
  const { checked, handle } = useRequireAuth();

  const [savedItems, setSavedItems] = useState<SavedFeedItem[]>([]);
  const [savedFeeds, setSavedFeeds] = useState<any[]>([]);
  const [savedLists, setSavedLists] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  const [curatedLists, setCuratedLists] = useState<any[]>([]);
  const [loadingCurated, setLoadingCurated] = useState(true);

  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverFeeds, setDiscoverFeeds] = useState<any[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(true);

  const [savingKey, setSavingKey] = useState<string | null>(null);

  const {
    checked: verificationChecked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  const savedFeedUris = useMemo(
    () =>
      new Set(
        savedItems
          .filter((item) => item.type === "feed")
          .map((item) => item.value)
      ),
    [savedItems]
  );

  const savedListUris = useMemo(
    () =>
      new Set(
        savedItems
          .filter((item) => item.type === "list")
          .map((item) => item.value)
      ),
    [savedItems]
  );

  function getSavedItem(type: "feed" | "list", uri: string) {
    return savedItems.find(
      (item) => item.type === type && item.value === uri
    );
  }

  async function loadSaved() {
    setLoadingSaved(true);

    try {
      const items = await getSavedFeedItems();
      setSavedItems(items);

      const feedItems = items.filter((item) => item.type === "feed");
      const listItems = items.filter((item) => item.type === "list");

      const [feedGenerators, lists] = await Promise.all([
        getFeedGenerators(feedItems.map((item) => item.value)),
        getListsMetadata(listItems.map((item) => item.value)),
      ]);

      setSavedFeeds(
        feedGenerators.map((feed: any) => ({
          ...feed,
          pinned:
            feedItems.find((item) => item.value === feed.uri)?.pinned ??
            false,
        }))
      );

      setSavedLists(
        lists.map((list: any) => ({
          ...list,
          pinned:
            listItems.find((item) => item.value === list.uri)?.pinned ??
            false,
        }))
      );
    } catch (error) {
      console.error("Impossible de charger les éléments enregistrés :", error);
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

            return {
              uri: list.uri,
              name: list.label,
            };
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

  const handleTogglePin = async (
    type: "feed" | "list",
    uri: string
  ) => {
    if (!requireVerification()) {
      return;
    }

    setSavedItems((previousItems) =>
      previousItems.map((item) =>
        item.type === type && item.value === uri
          ? { ...item, pinned: !item.pinned }
          : item
      )
    );

    if (type === "feed") {
      setSavedFeeds((previousFeeds) =>
        previousFeeds.map((feed) =>
          feed.uri === uri ? { ...feed, pinned: !feed.pinned } : feed
        )
      );
    } else {
      setSavedLists((previousLists) =>
        previousLists.map((list) =>
          list.uri === uri ? { ...list, pinned: !list.pinned } : list
        )
      );
    }

    try {
      if (type === "feed") {
        await togglePinFeed(uri);
      } else {
        await togglePinList(uri);
      }
    } catch (error) {
      console.error(error);
      await loadSaved();
    }
  };

  const handleRemove = async (
    type: "feed" | "list",
    uri: string
  ) => {
    if (!requireVerification()) {
      return;
    }

    setSavedItems((previousItems) =>
      previousItems.filter(
        (item) => !(item.type === type && item.value === uri)
      )
    );

    if (type === "feed") {
      setSavedFeeds((previousFeeds) =>
        previousFeeds.filter((feed) => feed.uri !== uri)
      );
    } else {
      setSavedLists((previousLists) =>
        previousLists.filter((list) => list.uri !== uri)
      );
    }

    try {
      if (type === "feed") {
        await removeFeed(uri);
      } else {
        await removeList(uri);
      }
    } catch (error) {
      console.error(error);
      await loadSaved();
    }
  };

  const handleSave = async (
    type: "feed" | "list",
    uri: string
  ) => {
    if (!requireVerification()) {
      return;
    }

    const key = `${type}:${uri}`;
    setSavingKey(key);

    try {
      if (type === "feed") {
        await saveFeed(uri);
      } else {
        await saveList(uri);
      }

      await loadSaved();
    } catch (error) {
      console.error(error);
      alert(
        type === "feed"
          ? "Impossible d'enregistrer ce fil."
          : "Impossible d'enregistrer cette liste."
      );
    } finally {
      setSavingKey(null);
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
                  Enregistrez et épinglez vos fils et listes préférés.
                </p>
              </div>

              <span className="rounded-full bg-kelo-background px-3 py-1 text-xs font-semibold text-kelo-muted">
                {savedItems.length} élément
                {savedItems.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </header>

        {!verified && verificationChecked && (
          <button
            type="button"
            onClick={requireVerification}
            className="w-full border-b border-kelo-border bg-kelo-background px-4 py-3 text-left text-sm sm:px-5 lg:px-6"
          >
            <span className="font-bold text-kelo-text">
              Vérification requise
            </span>
            <span className="ml-2 text-kelo-muted">
              Vous pouvez consulter les fils et les listes, mais vous devez être vérifié pour les enregistrer, les épingler ou les retirer.
            </span>
          </button>
        )}

        <div className="space-y-7 px-4 py-5 sm:px-5 lg:px-6">
          <section>
            <h2 className="text-base font-extrabold text-kelo-text">
              Accès rapides
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <Link
                href="/feed"
                className="flex items-center gap-3 rounded-2xl border border-kelo-border p-4 transition hover:bg-kelo-background/60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient">
                  <Home className="h-5 w-5 text-white" />
                </div>

                <div>
                  <p className="text-sm font-bold">Pour vous</p>
                  <p className="text-xs text-kelo-muted">
                    Vos abonnements
                  </p>
                </div>
              </Link>

              <Link
                href="/feed"
                className="flex items-center gap-3 rounded-2xl border border-kelo-border p-4 transition hover:bg-kelo-background/60"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient">
                  <Compass className="h-5 w-5 text-white" />
                </div>

                <div>
                  <p className="text-sm font-bold">Découvrir</p>
                  <p className="text-xs text-kelo-muted">
                    Tout le réseau fédéré
                  </p>
                </div>
              </Link>
            </div>
          </section>

          <section className="border-t border-kelo-border pt-6">
            <div>
              <h2 className="text-base font-extrabold text-kelo-text">
                Listes officielles
              </h2>

              <p className="mt-1 text-xs text-kelo-muted">
                Enregistrez une liste, puis épinglez-la pour l’afficher sur
                l’accueil.
              </p>
            </div>

            {loadingCurated ? (
              <p className="py-6 text-center text-sm text-kelo-muted">
                Chargement...
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {curatedLists.map((list: any) => {
                  const savedItem = getSavedItem("list", list.uri);
                  const isSaved = !!savedItem;
                  const isPinned = savedItem?.pinned ?? false;

                  return (
                    <div
                      key={list.uri}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border p-4 transition hover:bg-kelo-background/60"
                    >
                      <Link
                        href={`/feeds/list?uri=${encodeURIComponent(
                          list.uri
                        )}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        {list.avatar ? (
                          <img
                            src={list.avatar}
                            alt=""
                            className="h-11 w-11 flex-shrink-0 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient text-sm font-bold text-white">
                            {(list.name || "K").charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {list.name}
                          </p>

                          <p className="truncate text-xs text-kelo-muted">
                            {list.listItemCount ?? 0} membre
                            {(list.listItemCount ?? 0) > 1 ? "s" : ""}
                          </p>
                        </div>
                      </Link>

                      <div className="flex flex-shrink-0 items-center gap-1">
                        {isSaved ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleTogglePin("list", list.uri)
                              }
                              className={`rounded-lg p-2 transition ${
                                isPinned
                                  ? "bg-kelo-background text-kelo-primary"
                                  : "text-kelo-muted hover:bg-kelo-background hover:text-kelo-primary"
                              }`}
                              title={
                                isPinned ? "Désépingler" : "Épingler"
                              }
                            >
                              <Pin
                                className="h-4 w-4"
                                fill={isPinned ? "currentColor" : "none"}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleRemove("list", list.uri)
                              }
                              className="rounded-lg p-2 text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-danger"
                              title="Retirer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSave("list", list.uri)}
                            disabled={savingKey === `list:${list.uri}`}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-kelo-gradient text-white transition hover:opacity-90 disabled:opacity-40"
                            title="Enregistrer"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="border-t border-kelo-border pt-6">
            <h2 className="text-base font-extrabold text-kelo-text">
              Mes éléments enregistrés
            </h2>

            {loadingSaved ? (
              <p className="py-6 text-center text-sm text-kelo-muted">
                Chargement...
              </p>
            ) : savedFeeds.length + savedLists.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {savedFeeds.map((feed: any) => (
                  <div
                    key={feed.uri}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border p-4 transition hover:bg-kelo-background/60"
                  >
                    <Link
                      href={`/feeds/view?uri=${encodeURIComponent(
                        feed.uri
                      )}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      {feed.avatar ? (
                        <img
                          src={feed.avatar}
                          alt=""
                          className="h-11 w-11 flex-shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-background">
                          <Newspaper className="h-5 w-5 text-kelo-muted" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {feed.displayName}
                        </p>

                        <p className="truncate text-xs text-kelo-muted">
                          par @{feed.creator?.handle}
                        </p>
                      </div>
                    </Link>

                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() =>
                          handleTogglePin("feed", feed.uri)
                        }
                        className={`rounded-lg p-2 ${
                          feed.pinned
                            ? "bg-kelo-background text-kelo-primary"
                            : "text-kelo-muted hover:bg-kelo-background hover:text-kelo-primary"
                        }`}
                      >
                        <Pin
                          className="h-4 w-4"
                          fill={feed.pinned ? "currentColor" : "none"}
                        />
                      </button>

                      <button
                        onClick={() => handleRemove("feed", feed.uri)}
                        className="rounded-lg p-2 text-kelo-muted hover:bg-kelo-background hover:text-kelo-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {savedLists.map((list: any) => (
                  <div
                    key={list.uri}
                    className="flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border p-4 transition hover:bg-kelo-background/60"
                  >
                    <Link
                      href={`/feeds/list?uri=${encodeURIComponent(
                        list.uri
                      )}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      {list.avatar ? (
                        <img
                          src={list.avatar}
                          alt=""
                          className="h-11 w-11 flex-shrink-0 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-background">
                          <List className="h-5 w-5 text-kelo-muted" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {list.name}
                        </p>

                        <p className="truncate text-xs text-kelo-muted">
                          {list.listItemCount ?? 0} membre
                          {(list.listItemCount ?? 0) > 1 ? "s" : ""}
                        </p>
                      </div>
                    </Link>

                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() =>
                          handleTogglePin("list", list.uri)
                        }
                        className={`rounded-lg p-2 ${
                          list.pinned
                            ? "bg-kelo-background text-kelo-primary"
                            : "text-kelo-muted hover:bg-kelo-background hover:text-kelo-primary"
                        }`}
                      >
                        <Pin
                          className="h-4 w-4"
                          fill={list.pinned ? "currentColor" : "none"}
                        />
                      </button>

                      <button
                        onClick={() => handleRemove("list", list.uri)}
                        className="rounded-lg p-2 text-kelo-muted hover:bg-kelo-background hover:text-kelo-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-kelo-border px-6 py-10 text-center">
                <p className="text-sm font-bold">
                  Aucun élément enregistré
                </p>

                <p className="mt-1 text-xs text-kelo-muted">
                  Ajoutez un fil ou une liste pour le retrouver ici.
                </p>
              </div>
            )}
          </section>

          <section className="border-t border-kelo-border pt-6">
            <h2 className="text-base font-extrabold text-kelo-text">
              Découvrir de nouveaux fils
            </h2>

            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />

              <input
                value={discoverQuery}
                onChange={(event) =>
                  setDiscoverQuery(event.target.value)
                }
                placeholder="Rechercher des fils d'actu..."
                className="w-full rounded-full bg-kelo-background py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-kelo-primary"
              />
            </div>

            {loadingDiscover ? (
              <p className="py-6 text-center text-sm text-kelo-muted">
                Chargement...
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {discoverFeeds.map((feed: any) => {
                  const isSaved = savedFeedUris.has(feed.uri);

                  return (
                    <div
                      key={feed.uri}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-kelo-border p-4 transition hover:bg-kelo-background/60"
                    >
                      <Link
                        href={`/feeds/view?uri=${encodeURIComponent(
                          feed.uri
                        )}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        {feed.avatar ? (
                          <img
                            src={feed.avatar}
                            alt=""
                            className="h-11 w-11 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-background">
                            <Newspaper className="h-5 w-5 text-kelo-muted" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {feed.displayName}
                          </p>

                          {feed.description && (
                            <p className="line-clamp-2 text-xs text-kelo-muted">
                              {feed.description}
                            </p>
                          )}
                        </div>
                      </Link>

                      <button
                        onClick={() =>
                          handleSave("feed", feed.uri)
                        }
                        disabled={
                          isSaved ||
                          savingKey === `feed:${feed.uri}`
                        }
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-kelo-gradient text-white disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </div>
  );
}
