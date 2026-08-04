"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import CreateListModal from "@/components/lists/CreateListModal";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  deleteList,
  getMyLists,
  ManagedList,
} from "@/lib/atproto/lists";

export default function ListsPage() {
  const { checked, handle } = useRequireAuth();

  const [lists, setLists] = useState<ManagedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [openMenuUri, setOpenMenuUri] = useState<string | null>(null);
  const [deletingUri, setDeletingUri] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const items = await getMyLists();
      setLists(items);
    } catch (error) {
      console.error("Impossible de charger les listes :", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Impossible de charger vos listes."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checked) {
      return;
    }

    loadLists();
  }, [checked, loadLists]);

  useEffect(() => {
    const closeMenu = () => setOpenMenuUri(null);

    window.addEventListener("click", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, []);

  const filteredLists = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return lists;
    }

    return lists.filter((list) => {
      const name = list.name?.toLowerCase() || "";
      const description = list.description?.toLowerCase() || "";

      return name.includes(query) || description.includes(query);
    });
  }, [lists, searchQuery]);

  const handleCreated = (createdList: ManagedList) => {
    setLists((previousLists) => [createdList, ...previousLists]);
  };

  const handleDelete = async (list: ManagedList) => {
    const confirmed = window.confirm(
      `Supprimer définitivement la liste « ${list.name} » ?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingUri(list.uri);
    setOpenMenuUri(null);

    try {
      await deleteList(list.uri);

      setLists((previousLists) =>
        previousLists.filter((item) => item.uri !== list.uri)
      );
    } catch (error) {
      console.error("Impossible de supprimer la liste :", error);

      alert(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer cette liste."
      );
    } finally {
      setDeletingUri(null);
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
    <>
      <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
          <header className="sticky top-0 z-20 border-b border-kelo-border bg-white/95 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/feeds"
                  aria-label="Retour aux fils d’actu"
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-text"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="min-w-0">
                  <h1 className="truncate text-xl font-extrabold text-kelo-text sm:text-2xl">
                    Listes
                  </h1>

                  <p className="mt-0.5 truncate text-xs text-kelo-muted sm:text-sm">
                    Créez et gérez vos listes de comptes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-kelo-gradient px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
              >
                <Plus className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Nouvelle liste
                </span>

                <span className="sm:hidden">
                  Nouvelle
                </span>
              </button>
            </div>

            <div className="border-t border-kelo-border px-4 py-3 sm:px-5 lg:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Rechercher dans mes listes..."
                  className="w-full rounded-full bg-kelo-background py-3 pl-11 pr-4 text-sm text-kelo-text outline-none transition placeholder:text-kelo-muted focus:ring-2 focus:ring-kelo-primary"
                />
              </div>
            </div>
          </header>

          {loading && (
            <p className="px-4 py-10 text-center text-sm text-kelo-muted">
              Chargement de vos listes...
            </p>
          )}

          {!loading && loadError && (
            <div className="px-4 py-10 text-center sm:px-5 lg:px-6">
              <p className="text-sm text-kelo-danger">
                {loadError}
              </p>

              <button
                type="button"
                onClick={loadLists}
                className="mt-4 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60"
              >
                Réessayer
              </button>
            </div>
          )}

          {!loading &&
            !loadError &&
            filteredLists.length > 0 && (
              <div className="divide-y divide-kelo-border">
                {filteredLists.map((list) => (
                  <article
                    key={list.uri}
                    className="group flex items-start gap-3 px-4 py-4 transition hover:bg-kelo-background/50 sm:px-5 lg:px-6"
                  >
                    <Link
                      href={`/lists/${encodeURIComponent(list.uri)}`}
                      className="flex min-w-0 flex-1 items-start gap-3"
                    >
                      {list.avatar ? (
                        <img
                          src={list.avatar}
                          alt={`Avatar de ${list.name}`}
                          className="h-14 w-14 flex-shrink-0 rounded-2xl border border-kelo-border object-cover sm:h-16 sm:w-16"
                        />
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient text-white sm:h-16 sm:w-16">
                          <List className="h-6 w-6" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h2 className="truncate text-sm font-extrabold text-kelo-text sm:text-base">
                            {list.name}
                          </h2>

                          {list.creator?.handle && (
                            <span className="truncate text-xs text-kelo-muted">
                              par @{list.creator.handle}
                            </span>
                          )}
                        </div>

                        {list.description && (
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-kelo-muted">
                            {list.description}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-kelo-muted">
                          <Users className="h-3.5 w-3.5" />

                          <span>
                            {list.listItemCount ?? 0} membre
                            {(list.listItemCount ?? 0) > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="relative flex-shrink-0">
                      <button
                        type="button"
                        aria-label={`Actions pour ${list.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuUri((current) =>
                            current === list.uri ? null : list.uri
                          );
                        }}
                        disabled={deletingUri === list.uri}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-text disabled:opacity-50"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>

                      {openMenuUri === list.uri && (
                        <div
                          onClick={(event) => event.stopPropagation()}
                          className="absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-kelo-border bg-white py-1 shadow-xl"
                        >
                          <Link
                            href={`/lists/${encodeURIComponent(
                              list.uri
                            )}?edit=1`}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-kelo-text transition hover:bg-kelo-background"
                          >
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(list)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-kelo-danger transition hover:bg-kelo-background"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

          {!loading &&
            !loadError &&
            filteredLists.length === 0 &&
            searchQuery.trim() && (
              <div className="flex min-h-[calc(100vh-190px)] items-start justify-center px-6 py-12 sm:items-center">
                <div className="max-w-md text-center">
                  <Search className="mx-auto h-9 w-9 text-kelo-muted" />

                  <h2 className="mt-4 text-lg font-bold text-kelo-text">
                    Aucune liste trouvée
                  </h2>

                  <p className="mt-2 text-sm text-kelo-muted">
                    Essayez une autre recherche.
                  </p>
                </div>
              </div>
            )}

          {!loading &&
            !loadError &&
            lists.length === 0 &&
            !searchQuery.trim() && (
              <div className="flex min-h-[calc(100vh-190px)] items-start justify-center px-6 py-12 sm:items-center">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kelo-gradient text-white">
                    <List className="h-8 w-8" />
                  </div>

                  <h2 className="mt-5 text-xl font-extrabold text-kelo-text">
                    Créez votre première liste
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
                    Regroupez les comptes que vous souhaitez suivre dans
                    un même fil.
                  </p>

                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    Créer une liste
                  </button>
                </div>
              </div>
            )}
        </main>
      </div>

      <CreateListModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
