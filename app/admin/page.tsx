"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Newspaper,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getStoredSession } from "@/services/auth.service";

import {
  listCertifications,
  CertificationRecord,
} from "@/lib/atproto/certifications";

import {
  listIdentityVerifications,
  IdentityVerificationRecord,
  IdentityVerificationType,
  IdentityVerificationSource,
  IDENTITY_VERIFICATION_LABELS,
  IDENTITY_VERIFICATION_SOURCE_LABELS,
} from "@/lib/atproto/identity-verifications";

type CertificationStatus = "certified" | "trusted-verifier" | "none";
type AdminSection = "certifications" | "identity-verifications";

type AccountSearchResult = {
  did: string;
  handle: string;
  displayName: string;
  avatar: string | null;
};

const IDENTITY_TYPE_ICONS: Record<IdentityVerificationType, typeof UserRoundCheck> = {
  human: UserRoundCheck,
  enterprise: Building2,
  media: Newspaper,
  university: GraduationCap,
  association: HeartHandshake,
  institution: Landmark,
};

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, checked } = useIsAdmin();

  const [handle, setHandle] = useState("");
  const [activeSection, setActiveSection] = useState<AdminSection>("certifications");
  const [targetHandle, setTargetHandle] = useState("");

  const [certificationStatus, setCertificationStatus] =
    useState<CertificationStatus>("certified");
  const [selectedAccounts, setSelectedAccounts] = useState<AccountSearchResult[]>([]);
  const [accountSuggestions, setAccountSuggestions] = useState<AccountSearchResult[]>([]);
  const [searchingAccounts, setSearchingAccounts] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [identityVerificationType, setIdentityVerificationType] =
    useState<IdentityVerificationType>("human");
  const [identityVerificationSource, setIdentityVerificationSource] =
    useState<IdentityVerificationSource>("kelo-id");
  const [identityVerificationAction, setIdentityVerificationAction] =
    useState<"assign" | "remove">("assign");

  const [certifiedUsers, setCertifiedUsers] = useState<CertificationRecord[]>([]);
  const [identityVerifiedUsers, setIdentityVerifiedUsers] =
    useState<IdentityVerificationRecord[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(false);
  const [loadingIdentityVerifications, setLoadingIdentityVerifications] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certificationListError, setCertificationListError] = useState<string | null>(null);
  const [identityListError, setIdentityListError] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (session) setHandle(session.handle);
  }, []);

  useEffect(() => {
    if (!checked) return;
    if (!isAdmin) {
      const timeout = window.setTimeout(() => router.replace("/feed"), 1500);
      return () => window.clearTimeout(timeout);
    }
    refreshAll();
  }, [checked, isAdmin, router]);

  useEffect(() => {
    if (activeSection !== "certifications") {
      setAccountSuggestions([]);
      setSearchError(null);
      return;
    }

    const query = targetHandle.trim().replace(/^@/, "");
    if (query.length < 2) {
      setAccountSuggestions([]);
      setSearchError(null);
      setSearchingAccounts(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchingAccounts(true);
      setSearchError(null);

      try {
        const response = await fetch(`/api/admin/account-search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Impossible de rechercher les comptes.");
        }

        const alreadySelected = new Set(selectedAccounts.map((account) => account.did));
        setAccountSuggestions(
          ((data.actors || []) as AccountSearchResult[]).filter(
            (account) => !alreadySelected.has(account.did)
          )
        );
      } catch (searchFailure) {
        if (searchFailure instanceof DOMException && searchFailure.name === "AbortError") return;
        setAccountSuggestions([]);
        setSearchError(
          searchFailure instanceof Error
            ? searchFailure.message
            : "Impossible de rechercher les comptes."
        );
      } finally {
        if (!controller.signal.aborted) setSearchingAccounts(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [targetHandle, activeSection, selectedAccounts]);

  async function refreshCertifications() {
    setLoadingCertifications(true);
    setCertificationListError(null);
    try {
      setCertifiedUsers(await listCertifications());
    } catch (refreshError) {
      console.error("Erreur de chargement des certifications :", refreshError);
      setCertificationListError("Impossible de charger les certifications.");
    } finally {
      setLoadingCertifications(false);
    }
  }

  async function refreshIdentityVerifications() {
    setLoadingIdentityVerifications(true);
    setIdentityListError(null);
    try {
      setIdentityVerifiedUsers(await listIdentityVerifications());
    } catch (refreshError) {
      console.error("Erreur de chargement des vérifications :", refreshError);
      setIdentityListError("Impossible de charger les vérifications d’identité.");
    } finally {
      setLoadingIdentityVerifications(false);
    }
  }

  async function refreshAll() {
    await Promise.all([refreshCertifications(), refreshIdentityVerifications()]);
  }

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const getCleanTargetHandle = () => targetHandle.trim().replace(/^@/, "");

  const getSessionOrThrow = () => {
    const session = getStoredSession();
    if (!session) throw new Error("Votre session est introuvable. Reconnectez-vous.");
    return session;
  };

  const addSelectedAccount = (account: AccountSearchResult) => {
    setSelectedAccounts((current) =>
      current.some((item) => item.did === account.did) ? current : [...current, account]
    );
    setTargetHandle("");
    setAccountSuggestions([]);
    setSearchError(null);
  };

  const removeSelectedAccount = (did: string) => {
    setSelectedAccounts((current) => current.filter((account) => account.did !== did));
  };

  const handleAssignCertification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedAccounts.length === 0) {
      setError("Sélectionnez au moins un compte dans les résultats de recherche.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const session = getSessionOrThrow();
      const failures: string[] = [];

      for (const account of selectedAccounts) {
        try {
          const response = await fetch("/api/admin/certify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session,
              targetHandle: account.handle,
              status: certificationStatus,
            }),
          });
          const data = await response.json();
          if (!response.ok) {
            failures.push(`@${account.handle}: ${data.error || "échec"}`);
          }
        } catch {
          failures.push(`@${account.handle}: erreur réseau`);
        }
      }

      const updatedCount = selectedAccounts.length - failures.length;

      if (failures.length === selectedAccounts.length) {
        throw new Error(`Aucun compte n’a pu être mis à jour. ${failures.join(" · ")}`);
      }

      setSelectedAccounts([]);
      setTargetHandle("");
      setAccountSuggestions([]);
      setSuccess(
        failures.length === 0
          ? `${updatedCount} compte${updatedCount > 1 ? "s" : ""} mis à jour avec succès.`
          : `${updatedCount} compte${updatedCount > 1 ? "s" : ""} mis à jour. Échecs : ${failures.join(" · ")}`
      );
      await refreshCertifications();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Une erreur inconnue est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIdentityVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTargetHandle = getCleanTargetHandle();
    if (!cleanTargetHandle) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const session = getSessionOrThrow();
      const response = await fetch("/api/admin/identity-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          targetHandle: cleanTargetHandle,
          verificationType: identityVerificationType,
          source: identityVerificationSource,
          assignmentMode: "manual",
          remove: identityVerificationAction === "remove",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la mise à jour de la vérification.");
      }

      setTargetHandle("");
      setSuccess(
        identityVerificationAction === "remove"
          ? "La vérification d’identité a été révoquée."
          : "La vérification d’identité a été attribuée."
      );
      await refreshIdentityVerifications();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Une erreur inconnue est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification des droits d’accès...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background px-6 font-sans">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-extrabold text-kelo-text">Accès refusé</h1>
          <p className="mt-2 text-sm text-kelo-muted">
            Ce compte n’est pas reconnu comme administrateur. Redirection vers l’accueil...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-20 border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">Administration Kelo Social</h1>
              <p className="mt-1 text-xs text-kelo-muted sm:text-sm">
                Connecté en tant que @{handle || "administrateur"}
              </p>
            </div>
            <button
              type="button"
              onClick={refreshAll}
              disabled={loadingCertifications || loadingIdentityVerifications}
              className="inline-flex items-center gap-2 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loadingCertifications || loadingIdentityVerifications ? "animate-spin" : ""
                }`}
              />
              Actualiser
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setActiveSection("certifications");
                setError(null);
                setSuccess(null);
                setTargetHandle("");
              }}
              className={`rounded-3xl border p-5 text-left transition ${
                activeSection === "certifications"
                  ? "border-kelo-primary bg-kelo-background shadow-sm"
                  : "border-kelo-border bg-white hover:bg-kelo-background/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient text-white">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-kelo-text">Certifications</h2>
                  <p className="text-xs text-kelo-muted">Badges ronds et certificateurs de confiance</p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-extrabold text-kelo-text">{certifiedUsers.length}</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection("identity-verifications");
                setError(null);
                setSuccess(null);
                setTargetHandle("");
                setSelectedAccounts([]);
              }}
              className={`rounded-3xl border p-5 text-left transition ${
                activeSection === "identity-verifications"
                  ? "border-kelo-primary bg-kelo-background shadow-sm"
                  : "border-kelo-border bg-white hover:bg-kelo-background/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-kelo-text">Vérifications d’identité</h2>
                  <p className="text-xs text-kelo-muted">Attribution manuelle de secours</p>
                </div>
              </div>
              <p className="mt-4 text-2xl font-extrabold text-kelo-text">{identityVerifiedUsers.length}</p>
            </button>
          </div>

          {activeSection === "certifications" && (
            <>
              <form
                onSubmit={handleAssignCertification}
                className="flex flex-col gap-4 rounded-3xl border border-kelo-border bg-kelo-background p-4 sm:p-6"
              >
                <div>
                  <h2 className="text-lg font-extrabold text-kelo-text">Gérer les certifications en lot</h2>
                  <p className="mt-1 text-sm text-kelo-muted">
                    Recherchez un compte, sélectionnez-le, puis recommencez pour ajouter autant de comptes que vous voulez.
                  </p>
                </div>

                <div className="relative">
                  <label htmlFor="account-search" className="mb-2 block text-sm font-bold text-kelo-text">
                    Rechercher des comptes
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-kelo-muted" />
                    <input
                      id="account-search"
                      type="text"
                      value={targetHandle}
                      onChange={(event) => setTargetHandle(event.target.value)}
                      placeholder="Tapez au moins 2 lettres, ex. kel..."
                      autoComplete="off"
                      className="w-full rounded-2xl border border-kelo-border bg-white py-3 pl-11 pr-4 text-sm text-kelo-text outline-none transition placeholder:text-kelo-muted focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/10"
                    />
                  </div>

                  {(searchingAccounts || accountSuggestions.length > 0 || searchError) && targetHandle.trim().length >= 2 && (
                    <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-kelo-border bg-white p-2 shadow-xl">
                      {searchingAccounts ? (
                        <p className="px-3 py-4 text-center text-sm text-kelo-muted">Recherche des comptes...</p>
                      ) : searchError ? (
                        <p className="px-3 py-4 text-sm text-kelo-danger">{searchError}</p>
                      ) : accountSuggestions.length > 0 ? (
                        accountSuggestions.map((account) => (
                          <button
                            key={account.did}
                            type="button"
                            onClick={() => addSelectedAccount(account)}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-kelo-background"
                          >
                            {account.avatar ? (
                              <img
                                src={account.avatar}
                                alt=""
                                className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-kelo-background text-sm font-extrabold text-kelo-primary">
                                {(account.displayName || account.handle).slice(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-kelo-text">{account.displayName}</p>
                              <p className="truncate text-xs text-kelo-muted">@{account.handle}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-4 text-center text-sm text-kelo-muted">Aucun compte trouvé.</p>
                      )}
                    </div>
                  )}
                </div>

                {selectedAccounts.length > 0 && (
                  <div className="rounded-2xl border border-kelo-border bg-white p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-extrabold text-kelo-text">
                        Comptes sélectionnés
                      </p>
                      <span className="rounded-full bg-kelo-background px-3 py-1 text-xs font-bold text-kelo-primary">
                        {selectedAccounts.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedAccounts.map((account) => (
                        <div
                          key={account.did}
                          className="flex max-w-full items-center gap-2 rounded-full border border-kelo-border bg-kelo-background px-3 py-2"
                        >
                          {account.avatar && (
                            <img src={account.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                          )}
                          <span className="max-w-[220px] truncate text-xs font-bold text-kelo-text">
                            @{account.handle}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSelectedAccount(account.did)}
                            aria-label={`Retirer @${account.handle}`}
                            className="rounded-full p-0.5 text-kelo-muted transition hover:bg-white hover:text-kelo-danger"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Select
                  label="Certification"
                  value={certificationStatus}
                  onChange={(event) => setCertificationStatus(event.target.value as CertificationStatus)}
                >
                  <option value="certified">Compte certifié</option>
                  <option value="trusted-verifier">Certificateur de confiance</option>
                  <option value="none">Révoquer la certification</option>
                </Select>

                {error && <p className="text-sm font-medium text-kelo-danger">{error}</p>}
                {success && <p className="text-sm font-medium text-green-700">{success}</p>}

                <Button
                  type="submit"
                  loading={submitting}
                  loadingText="Mise à jour en lot..."
                  disabled={selectedAccounts.length === 0 || submitting}
                >
                  Mettre à jour la certification
                  {selectedAccounts.length > 0 ? ` (${selectedAccounts.length})` : ""}
                </Button>
              </form>

              <section>
                <h2 className="mb-4 text-lg font-bold text-kelo-text">Comptes certifiés</h2>
                <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border bg-white">
                  {loadingCertifications ? (
                    <p className="p-6 text-center text-sm text-kelo-muted">Chargement...</p>
                  ) : certificationListError ? (
                    <p className="p-6 text-center text-sm text-kelo-danger">{certificationListError}</p>
                  ) : certifiedUsers.length > 0 ? (
                    certifiedUsers.map((user) => (
                      <div
                        key={`${user.subjectDid}-${user.status}`}
                        className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-kelo-text">@{user.subjectHandle}</p>
                          <p className="truncate text-xs text-kelo-muted">{user.subjectDid}</p>
                        </div>
                        <Badge status={user.status} />
                      </div>
                    ))
                  ) : (
                    <p className="p-6 text-center text-sm text-kelo-muted">Aucun compte certifié.</p>
                  )}
                </div>
              </section>
            </>
          )}

          {activeSection === "identity-verifications" && (
            <>
              <form
                onSubmit={handleIdentityVerification}
                className="flex flex-col gap-4 rounded-3xl border border-kelo-border bg-kelo-background p-4 sm:p-6"
              >
                <div>
                  <h2 className="text-lg font-extrabold text-kelo-text">Vérification manuelle de secours</h2>
                  <p className="mt-1 text-sm leading-relaxed text-kelo-muted">
                    Utilisez cette fonction uniquement si la synchronisation avec Kelo ID ou Kelo Verify échoue. Aucune donnée d’identité sensible n’est enregistrée dans le PDS.
                  </p>
                </div>

                <Input
                  label="Identifiant du compte"
                  type="text"
                  required
                  value={targetHandle}
                  onChange={(event) => setTargetHandle(event.target.value)}
                  placeholder="ex. utilisateur.eurosky.social"
                />

                <Select
                  label="Action"
                  value={identityVerificationAction}
                  onChange={(event) => setIdentityVerificationAction(event.target.value as "assign" | "remove")}
                >
                  <option value="assign">Attribuer ou mettre à jour</option>
                  <option value="remove">Révoquer la vérification</option>
                </Select>

                {identityVerificationAction === "assign" && (
                  <>
                    <Select
                      label="Type de vérification"
                      value={identityVerificationType}
                      onChange={(event) => setIdentityVerificationType(event.target.value as IdentityVerificationType)}
                    >
                      <option value="human">Humain vérifié</option>
                      <option value="enterprise">Entreprise vérifiée</option>
                      <option value="media">Média vérifié</option>
                      <option value="university">Université vérifiée</option>
                      <option value="association">Association vérifiée</option>
                      <option value="institution">Institution vérifiée</option>
                    </Select>

                    <Select
                      label="Source de la vérification"
                      value={identityVerificationSource}
                      onChange={(event) => setIdentityVerificationSource(event.target.value as IdentityVerificationSource)}
                    >
                      <option value="kelo-id">Kelo ID</option>
                      <option value="kelo-verify">Kelo Verify</option>
                    </Select>
                  </>
                )}

                {error && <p className="text-sm font-medium text-kelo-danger">{error}</p>}
                {success && <p className="text-sm font-medium text-green-700">{success}</p>}

                <Button type="submit" loading={submitting} loadingText="Mise à jour...">
                  {identityVerificationAction === "remove"
                    ? "Révoquer la vérification"
                    : "Attribuer la vérification"}
                </Button>
              </form>

              <section>
                <h2 className="mb-4 text-lg font-bold text-kelo-text">Identités vérifiées</h2>
                <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border bg-white">
                  {loadingIdentityVerifications ? (
                    <p className="p-6 text-center text-sm text-kelo-muted">Chargement...</p>
                  ) : identityListError ? (
                    <p className="p-6 text-center text-sm text-kelo-danger">{identityListError}</p>
                  ) : identityVerifiedUsers.length > 0 ? (
                    identityVerifiedUsers.map((record) => {
                      const Icon = IDENTITY_TYPE_ICONS[record.verificationType];
                      return (
                        <div
                          key={record.subjectDid}
                          className="flex flex-wrap items-center justify-between gap-4 p-4"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-gradient text-white">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-kelo-text">@{record.subjectHandle}</p>
                              <p className="truncate text-xs text-kelo-muted">{record.subjectDid}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-kelo-text">
                              {IDENTITY_VERIFICATION_LABELS[record.verificationType]}
                            </p>
                            <p className="text-xs text-kelo-muted">
                              {IDENTITY_VERIFICATION_SOURCE_LABELS[record.source]} · {record.assignmentMode === "manual" ? "Secours manuel" : "Automatique"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="p-6 text-center text-sm text-kelo-muted">Aucune vérification d’identité.</p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
