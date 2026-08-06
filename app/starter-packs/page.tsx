"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
  Rocket,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import CreateStarterPackModal from "@/components/starter-packs/CreateStarterPackModal";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import {
  deleteStarterPack,
  getMyStarterPacks,
  StarterPackView,
} from "@/lib/atproto/starter-packs";

function getPackName(pack: StarterPackView): string {
  return pack.record?.name || pack.list?.name || "Kit de démarrage";
}

function getPackDescription(pack: StarterPackView): string | undefined {
  return pack.record?.description || pack.list?.description;
}

export default function StarterPacksPage() {
  const { checked, handle } = useRequireAuth();

  const [packs, setPacks] = useState<StarterPackView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [openMenuUri, setOpenMenuUri] = useState<string | null>(null);
  const [deletingUri, setDeletingUri] = useState<string | null>(null);

  const {
    checked: verificationChecked,
    verified,
    dialogOpen,
    requireVerification,
    closeDialog,
  } = useIdentityVerification();

  const openCreateModal = () => {
    if (!requireVerification()) {
      return;
    }

    setModalOpen(true);
  };

  const loadPacks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      setPacks(await getMyStarterPacks());
    } catch (error) {
      console.error(error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Impossible de charger vos kits."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (checked) {
      loadPacks();
    }
  }, [checked, loadPacks]);

  useEffect(() => {
    const closeMenu = () => setOpenMenuUri(null);
    window.addEventListener("click", closeMenu);

    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const filteredPacks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return packs;

    return packs.filter((pack) => {
      return (
        getPackName(pack).toLowerCase().includes(query) ||
        (getPackDescription(pack) || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [packs, searchQuery]);

  const handleDelete = async (pack: StarterPackView) => {
    if (!requireVerification()) {
      return;
    }

    if (!confirm(`Supprimer « ${getPackName(pack)} » ?`)) {
      return;
    }

    setDeletingUri(pack.uri);
    setOpenMenuUri(null);

    try {
      await deleteStarterPack(pack.uri);
      setPacks((previous) =>
        previous.filter((item) => item.uri !== pack.uri)
      );
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce kit."
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
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">
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
                  className="flex h-10 w-10 items-center justify-center rounded-full text-kelo-muted hover:bg-kelo-background"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="min-w-0">
                  <h1 className="truncate text-xl font-extrabold sm:text-2xl">
                    Kits de démarrage
                  </h1>

                  <p className="truncate text-xs text-kelo-muted sm:text-sm">
                    Créez des sélections de comptes et de fils.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-4 py-2.5 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nouveau kit</span>
                <span className="sm:hidden">Nouveau</span>
              </button>
            </div>

            <div className="border-t border-kelo-border px-4 py-3 sm:px-5 lg:px-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />

                <input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  placeholder="Rechercher dans mes kits..."
                  className="w-full rounded-full bg-kelo-background py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-kelo-primary"
                />
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
                Vous pouvez consulter vos kits, mais vous devez être vérifié pour en créer ou en supprimer.
              </span>
            </button>
          )}

          {loading && (
            <p className="py-10 text-center text-sm text-kelo-muted">
              Chargement...
            </p>
          )}

          {!loading && loadError && (
            <div className="py-10 text-center">
              <p className="text-sm text-kelo-danger">{loadError}</p>
              <button
                onClick={loadPacks}
                className="mt-4 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold"
              >
                Réessayer
              </button>
            </div>
          )}

          {!loading && !loadError && filteredPacks.length > 0 && (
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:p-6 2xl:grid-cols-3">
              {filteredPacks.map((pack) => (
                <article
                  key={pack.uri}
                  className="relative overflow-hidden rounded-3xl border border-kelo-border bg-white transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <Link
                    href={`/starter-packs/${encodeURIComponent(
                      pack.uri
                    )}`}
                    className="block"
                  >
                    {pack.list?.avatar ? (
                      <img
                        src={pack.list.avatar}
                        alt=""
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-kelo-gradient text-white">
                        <Rocket className="h-12 w-12" />
                      </div>
                    )}

                    <div className="p-4">
                      <h2 className="truncate font-extrabold">
                        {getPackName(pack)}
                      </h2>

                      {getPackDescription(pack) && (
                        <p className="mt-1 line-clamp-2 text-sm text-kelo-muted">
                          {getPackDescription(pack)}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-1.5 text-xs text-kelo-muted">
                        <Users className="h-3.5 w-3.5" />
                        {pack.list?.listItemCount ?? 0} membre
                        {(pack.list?.listItemCount ?? 0) > 1 ? "s" : ""}
                      </div>
                    </div>
                  </Link>

                  <div className="absolute right-3 top-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuUri((current) =>
                          current === pack.uri ? null : pack.uri
                        );
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-kelo-text shadow"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>

                    {openMenuUri === pack.uri && (
                      <div
                        onClick={(event) => event.stopPropagation()}
                        className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-2xl border border-kelo-border bg-white py-1 shadow-xl"
                      >
                        <button
                          type="button"
                          onClick={() => handleDelete(pack)}
                          disabled={deletingUri === pack.uri}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-kelo-danger hover:bg-kelo-background"
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
            packs.length === 0 &&
            !searchQuery.trim() && (
              <div className="flex min-h-[calc(100vh-180px)] items-center justify-center px-6 text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kelo-gradient text-white">
                    <Rocket className="h-8 w-8" />
                  </div>

                  <h2 className="mt-5 text-xl font-extrabold">
                    Créez votre premier kit
                  </h2>

                  <p className="mt-2 text-sm text-kelo-muted">
                    Regroupez des comptes recommandés et jusqu’à trois fils d’actu.
                  </p>

                  <button
                    onClick={openCreateModal}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-5 py-3 text-sm font-bold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Créer un kit
                  </button>
                </div>
              </div>
            )}
        </main>
      </div>

      <CreateStarterPackModal
        open={modalOpen && verified}
        onClose={() => setModalOpen(false)}
        onCreated={(pack) =>
          setPacks((previous) => [pack, ...previous])
        }
      />

      <VerificationRequiredDialog
        open={dialogOpen}
        onClose={closeDialog}
      />
    </>
  );
}
