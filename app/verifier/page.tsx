"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";
import {
  BadgeCheck,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import {
  useAdminRole,
} from "@/hooks/useAdminRole";

import {
  getStoredSession,
} from "@/services/auth.service";

import {
  searchNetworkActors,
} from "@/lib/atproto/search";

import {
  CertificationRecord,
  listCertificationsByIssuer,
} from "@/lib/atproto/certifications";

interface SelectedActor {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  description?: string;
}

export default function VerifierPage() {
  const router = useRouter();

  const {
    checked,
    isAdmin,
    isTrustedVerifier,
    did,
    handle,
  } = useAdminRole();

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<any[]>([]);

  const [selectedActor, setSelectedActor] =
    useState<SelectedActor | null>(
      null
    );

  const [searching, setSearching] =
    useState(false);

  const [certifications, setCertifications] =
    useState<CertificationRecord[]>([]);

  const [loadingList, setLoadingList] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  useEffect(() => {
    if (!checked) {
      return;
    }

    if (isAdmin) {
      router.replace("/admin");
      return;
    }

    if (!isTrustedVerifier) {
      router.replace("/feed");
      return;
    }

    refreshMyCertifications();
  }, [
    checked,
    isAdmin,
    isTrustedVerifier,
    router,
    did,
  ]);

  useEffect(() => {
    const cleanQuery = query
      .trim()
      .replace(/^@/, "");

    if (
      selectedActor ||
      cleanQuery.length < 2
    ) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const timeout =
      window.setTimeout(async () => {
        try {
          const actors =
            await searchNetworkActors(
              cleanQuery,
              8
            );

          setResults(actors);
        } catch (error) {
          console.error(
            "Erreur de recherche :",
            error
          );

          setResults([]);
        } finally {
          setSearching(false);
        }
      }, 350);

    return () =>
      window.clearTimeout(timeout);
  }, [query, selectedActor]);

  async function refreshMyCertifications() {
    if (!did) {
      return;
    }

    setLoadingList(true);
    setError(null);

    try {
      const records =
        await listCertificationsByIssuer(
          did
        );

      setCertifications(
        records.filter(
          (record) =>
            record.status === "certified"
        )
      );
    } catch (error) {
      console.error(
        "Impossible de charger les certifications :",
        error
      );

      setError(
        "Impossible de charger vos certifications."
      );
    } finally {
      setLoadingList(false);
    }
  }

  const selectedIsAlreadyCertified =
    useMemo(
      () =>
        !!selectedActor &&
        certifications.some(
          (record) =>
            record.subjectDid.toLowerCase() ===
            selectedActor.did.toLowerCase()
        ),
      [
        selectedActor,
        certifications,
      ]
    );

  const chooseActor = (
    actor: any
  ) => {
    if (
      !actor?.did ||
      !actor?.handle
    ) {
      return;
    }

    setSelectedActor({
      did: actor.did,
      handle: actor.handle,
      displayName:
        actor.displayName,
      avatar: actor.avatar,
      description:
        actor.description,
    });

    setQuery(actor.handle);
    setResults([]);
    setError(null);
    setSuccess(null);
  };

  const clearSelection = () => {
    setSelectedActor(null);
    setQuery("");
    setResults([]);
    setError(null);
    setSuccess(null);
  };

  const sendCertificationAction =
    async (
      targetHandle: string,
      status: "certified" | "none"
    ) => {
      const session =
        getStoredSession();

      if (!session) {
        throw new Error(
          "Votre session est introuvable. Reconnectez-vous."
        );
      }

      const response = await fetch(
        "/api/admin/certify",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            session,
            targetHandle,
            status,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Impossible de mettre à jour la certification."
        );
      }

      return data;
    };

  const handleCertify = async () => {
    if (
      !selectedActor ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await sendCertificationAction(
        selectedActor.handle,
        "certified"
      );

      setSuccess(
        `@${selectedActor.handle} est maintenant certifié.`
      );

      await refreshMyCertifications();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (
    record: CertificationRecord
  ) => {
    if (submitting) {
      return;
    }

    const confirmed =
      window.confirm(
        `Retirer la certification de @${record.subjectHandle} ?`
      );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await sendCertificationAction(
        record.subjectHandle,
        "none"
      );

      setSuccess(
        `La certification de @${record.subjectHandle} a été retirée.`
      );

      setCertifications(
        (previous) =>
          previous.filter(
            (item) =>
              item.subjectDid !==
              record.subjectDid
          )
      );

      if (
        selectedActor?.did ===
        record.subjectDid
      ) {
        clearSelection();
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Une erreur inconnue est survenue."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href =
      "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-sm text-kelo-muted">
        Vérification de vos droits...
      </div>
    );
  }

  if (
    !isTrustedVerifier ||
    isAdmin
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-sm text-kelo-muted">
        Redirection...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar
        handle={handle}
        onLogout={handleLogout}
      />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-20 border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">
                Panneau certificateur
              </h1>

              <p className="mt-1 text-xs text-kelo-muted sm:text-sm">
                Connecté en tant que
                {" "}@{handle}
              </p>
            </div>

            <button
              type="button"
              onClick={
                refreshMyCertifications
              }
              disabled={loadingList}
              className="inline-flex items-center gap-2 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loadingList
                    ? "animate-spin"
                    : ""
                }`}
              />

              Actualiser
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-kelo-border bg-kelo-background p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient text-white">
                <BadgeCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-kelo-text">
                  Certifier un compte
                </h2>

                <p className="text-sm text-kelo-muted">
                  Vous pouvez attribuer uniquement des badges ronds.
                </p>
              </div>
            </div>

            <div className="relative mt-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />

                <input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(
                      event.target.value
                    );

                    if (selectedActor) {
                      setSelectedActor(null);
                    }
                  }}
                  placeholder="Commencez à taper un nom ou un handle..."
                  className="w-full rounded-2xl border border-kelo-border bg-white py-3 pl-11 pr-12 text-sm outline-none transition focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/20"
                />

                {(query ||
                  selectedActor) && (
                  <button
                    type="button"
                    onClick={
                      clearSelection
                    }
                    aria-label="Effacer"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-kelo-muted hover:text-kelo-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!selectedActor &&
                query
                  .trim()
                  .replace(/^@/, "")
                  .length >= 2 && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-kelo-border bg-white shadow-kelo">
                    {searching ? (
                      <p className="p-4 text-center text-sm text-kelo-muted">
                        Recherche...
                      </p>
                    ) : results.length >
                      0 ? (
                      results.map(
                        (actor) => (
                          <button
                            key={actor.did}
                            type="button"
                            onClick={() =>
                              chooseActor(
                                actor
                              )
                            }
                            className="flex w-full items-start gap-3 border-b border-kelo-border p-4 text-left transition last:border-b-0 hover:bg-kelo-background/60"
                          >
                            <Avatar
                              src={
                                actor.avatar
                              }
                              fallback={
                                actor.handle?.[0]?.toUpperCase() ||
                                "U"
                              }
                              size="sm"
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-bold text-kelo-text">
                                  {actor.displayName ||
                                    actor.handle}
                                </span>

                                <AccountBadges
                                  actor={
                                    actor
                                  }
                                  identitySize="sm"
                                  certificationSize={
                                    15
                                  }
                                  gap="xs"
                                />
                              </div>

                              <p className="truncate text-xs text-kelo-muted">
                                @{actor.handle}
                              </p>
                            </div>
                          </button>
                        )
                      )
                    ) : (
                      <p className="p-4 text-center text-sm text-kelo-muted">
                        Aucun compte trouvé.
                      </p>
                    )}
                  </div>
                )}
            </div>

            {selectedActor && (
              <div className="mt-4 rounded-2xl border border-kelo-border bg-white p-4">
                <div className="flex items-start gap-3">
                  <Avatar
                    src={
                      selectedActor.avatar
                    }
                    fallback={
                      selectedActor.handle?.[0]?.toUpperCase() ||
                      "U"
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-kelo-text">
                      {selectedActor.displayName ||
                        selectedActor.handle}
                    </p>

                    <p className="truncate text-sm text-kelo-muted">
                      @{selectedActor.handle}
                    </p>

                    <p className="mt-1 truncate text-xs text-kelo-muted">
                      {selectedActor.did}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={
                      handleCertify
                    }
                    disabled={
                      selectedIsAlreadyCertified
                    }
                    loading={submitting}
                    loadingText="Certification..."
                  >
                    {selectedIsAlreadyCertified
                      ? "Déjà certifié par vous"
                      : "Attribuer le badge rond"}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm font-medium text-kelo-danger">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-4 text-sm font-medium text-green-700">
                {success}
              </p>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-kelo-text">
                  Mes certifications
                </h2>

                <p className="mt-1 text-sm text-kelo-muted">
                  Vous pouvez retirer uniquement les badges que vous avez attribués.
                </p>
              </div>

              <span className="rounded-full bg-kelo-background px-3 py-1 text-xs font-bold text-kelo-muted">
                {certifications.length}
              </span>
            </div>

            <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border bg-white">
              {loadingList ? (
                <p className="p-6 text-center text-sm text-kelo-muted">
                  Chargement...
                </p>
              ) : certifications.length >
                0 ? (
                certifications.map(
                  (record) => (
                    <div
                      key={
                        record.subjectDid
                      }
                      className="flex flex-wrap items-center justify-between gap-4 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-kelo-text">
                          @{record.subjectHandle}
                        </p>

                        <p className="truncate text-xs text-kelo-muted">
                          {record.subjectDid}
                        </p>

                        <p className="mt-1 text-xs text-kelo-muted">
                          Attribuée le{" "}
                          {new Date(
                            record.issuedAt
                          ).toLocaleDateString(
                            "fr-BE"
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          status="certified"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            handleRevoke(
                              record
                            )
                          }
                          disabled={
                            submitting
                          }
                          className="rounded-full bg-kelo-background px-4 py-2 text-xs font-bold text-kelo-danger transition hover:bg-kelo-border/60 disabled:opacity-50"
                        >
                          Retirer
                        </button>
                      </div>
                    </div>
                  )
                )
              ) : (
                <p className="p-6 text-center text-sm text-kelo-muted">
                  Vous n’avez encore attribué aucune certification.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
