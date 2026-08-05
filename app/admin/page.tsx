"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

type BadgeStatus = "certified" | "trusted-verifier" | "none";

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, checked } = useIsAdmin();

  const [handle, setHandle] = useState("");
  const [targetHandle, setTargetHandle] = useState("");
  const [status, setStatus] =
    useState<BadgeStatus>("certified");

  const [certifiedUsers, setCertifiedUsers] = useState<
    CertificationRecord[]
  >([]);

  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();

    if (session) {
      setHandle(session.handle);
    }
  }, []);

  useEffect(() => {
    if (!checked) {
      return;
    }

    if (!isAdmin) {
      const timeout = window.setTimeout(() => {
        router.replace("/feed");
      }, 1500);

      return () => window.clearTimeout(timeout);
    }

    refreshList();
  }, [checked, isAdmin, router]);

  async function refreshList() {
    setLoadingList(true);
    setListError(null);

    try {
      const records = await listCertifications();
      setCertifiedUsers(records);
    } catch (error) {
      console.error(
        "Erreur de chargement des certifications :",
        error
      );

      setListError(
        "Impossible de charger les certifications."
      );
    } finally {
      setLoadingList(false);
    }
  }

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleAssignBadge = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const cleanTargetHandle = targetHandle
      .trim()
      .replace(/^@/, "");

    if (!cleanTargetHandle) {
      return;
    }

    const session = getStoredSession();

    if (!session) {
      setError(
        "Votre session est introuvable. Reconnectez-vous."
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/certify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session,
          targetHandle: cleanTargetHandle,
          status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Erreur lors de l’attribution du badge."
        );
      }

      setTargetHandle("");
      await refreshList();
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
          <h1 className="text-xl font-extrabold text-kelo-text">
            Accès refusé
          </h1>

          <p className="mt-2 text-sm text-kelo-muted">
            Ce compte n’est pas reconnu comme administrateur.
            Redirection vers l’accueil...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
          <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">
            Administration &amp; Certifications
          </h1>

          <p className="mt-1 text-xs text-kelo-muted sm:text-sm">
            Connecté en tant que @{handle || "administrateur"}
          </p>
        </header>

        <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
          <section>
            <p className="text-sm leading-relaxed text-kelo-muted">
              Les certifications sont publiées dans le dépôt AT
              Protocol de @kelosocial.eu et peuvent être visibles
              par les clients compatibles du réseau fédéré.
            </p>
          </section>

          <form
            onSubmit={handleAssignBadge}
            className="flex flex-col gap-4 rounded-2xl border border-kelo-border bg-kelo-background p-4 sm:p-6"
          >
            <Input
              label="Identifiant de l’utilisateur"
              type="text"
              required
              value={targetHandle}
              onChange={(event) =>
                setTargetHandle(event.target.value)
              }
              placeholder="ex. utilisateur.bsky.social"
            />

            <Select
              label="Rôle ou badge à attribuer"
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as BadgeStatus
                )
              }
            >
              <option value="certified">
                Compte certifié
              </option>

              <option value="trusted-verifier">
                Certificateur de confiance
              </option>

              <option value="none">
                Révoquer la certification
              </option>
            </Select>

            {error && (
              <p
                role="alert"
                className="text-sm font-medium text-kelo-danger"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              loading={submitting}
              loadingText="Mise à jour..."
            >
              Mettre à jour le statut
            </Button>
          </form>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-kelo-text">
                Comptes certifiés
              </h2>

              <button
                type="button"
                onClick={refreshList}
                disabled={loadingList}
                className="rounded-full bg-kelo-background px-4 py-2 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60 disabled:opacity-50"
              >
                Actualiser
              </button>
            </div>

            <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border bg-white">
              {loadingList ? (
                <p className="p-6 text-center text-sm text-kelo-muted">
                  Chargement...
                </p>
              ) : listError ? (
                <p className="p-6 text-center text-sm text-kelo-danger">
                  {listError}
                </p>
              ) : certifiedUsers.length > 0 ? (
                certifiedUsers.map((user) => (
                  <div
                    key={`${user.subjectDid}-${user.status}`}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-kelo-text">
                        @{user.subjectHandle}
                      </p>

                      <p className="truncate text-xs text-kelo-muted">
                        {user.subjectDid}
                      </p>
                    </div>

                    <Badge status={user.status} />
                  </div>
                ))
              ) : (
                <p className="p-6 text-center text-sm text-kelo-muted">
                  Aucun compte certifié pour l’instant.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
