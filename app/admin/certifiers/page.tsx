"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import Badge from "@/components/ui/Badge";
import BatchCertificationManager from "@/components/admin/BatchCertificationManager";

import { useAdminRole } from "@/hooks/useAdminRole";
import { getStoredSession } from "@/services/auth.service";
import {
  CertificationRecord,
  clearCertificationCache,
  listCertifications,
} from "@/lib/atproto/certifications";

interface PendingReview {
  verifier: CertificationRecord;
  certifications: CertificationRecord[];
}

export default function CertifiersAdminPage() {
  const router = useRouter();
  const { checked, isAdmin, handle } = useAdminRole();

  const [records, setRecords] = useState<CertificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingDid, setWorkingDid] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      clearCertificationCache();
      setRecords(await listCertifications());
    } catch (loadError) {
      console.error(loadError);
      setError("Impossible de charger les certifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checked) return;

    if (!isAdmin) {
      router.replace("/feed");
      return;
    }

    void loadRecords();
  }, [checked, isAdmin, loadRecords, router]);

  const trustedVerifiers = useMemo(
    () => records.filter((record) => record.status === "trusted-verifier"),
    [records]
  );

  const certificationsByIssuer = useMemo(() => {
    const map = new Map<string, CertificationRecord[]>();

    for (const record of records) {
      if (record.status !== "certified" || !record.issuerDid) continue;
      const key = record.issuerDid.toLowerCase();
      const current = map.get(key) || [];
      current.push(record);
      map.set(key, current);
    }

    return map;
  }, [records]);

  async function sendCertificationAction(
    targetHandle: string,
    status: "certified" | "trusted-verifier" | "none"
  ) {
    const session = getStoredSession();

    if (!session) {
      throw new Error("Session introuvable. Reconnectez-vous.");
    }

    const response = await fetch("/api/admin/certify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, targetHandle, status }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Impossible de modifier la certification.");
    }

    return data;
  }

  const beginRemoval = async (verifier: CertificationRecord) => {
    const issued = certificationsByIssuer.get(verifier.subjectDid.toLowerCase()) || [];
    const confirmed = window.confirm(
      `Retirer la fleur de @${verifier.subjectHandle} ? Ses ${issued.length} certification(s) seront ensuite examinées.`
    );

    if (!confirmed) return;

    setWorkingDid(verifier.subjectDid);
    setError(null);
    setSuccess(null);

    try {
      await sendCertificationAction(verifier.subjectHandle, "none");
      setPendingReview({ verifier, certifications: issued });
      setRecords((previous) =>
        previous.filter((record) => record.subjectDid !== verifier.subjectDid)
      );
      setSuccess(
        `La fleur de @${verifier.subjectHandle} a été retirée. Examinez maintenant ses certifications.`
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Une erreur est survenue."
      );
    } finally {
      setWorkingDid(null);
    }
  };

  const resolveCertification = async (
    certification: CertificationRecord,
    action: "keep" | "remove"
  ) => {
    setWorkingDid(certification.subjectDid);
    setError(null);
    setSuccess(null);

    try {
      await sendCertificationAction(
        certification.subjectHandle,
        action === "keep" ? "certified" : "none"
      );

      setPendingReview((current) => {
        if (!current) return current;
        const remaining = current.certifications.filter(
          (item) => item.subjectDid !== certification.subjectDid
        );
        return remaining.length > 0 ? { ...current, certifications: remaining } : null;
      });

      setSuccess(
        action === "keep"
          ? `La certification de @${certification.subjectHandle} est conservée sous la responsabilité de Kelo Social.`
          : `La certification de @${certification.subjectHandle} a été retirée.`
      );

      await loadRecords();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Une erreur est survenue."
      );
    } finally {
      setWorkingDid(null);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked || (checked && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-sm text-kelo-muted">
        Vérification des droits…
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
              <h1 className="text-xl font-extrabold sm:text-2xl">
                Certificateurs de confiance
              </h1>
              <p className="mt-1 text-sm text-kelo-muted">
                Recherchez, sélectionnez et certifiez plusieurs comptes AT Protocol en une seule opération.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRecords}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl space-y-7 px-4 py-6 sm:px-6 lg:px-8">
          {error && (
            <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-kelo-danger">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-2xl bg-green-50 p-4 text-sm font-medium text-green-700">
              {success}
            </p>
          )}

          <BatchCertificationManager onUpdated={loadRecords} />

          {pendingReview && (
            <section className="rounded-3xl border border-kelo-primary bg-kelo-background p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold">Certifications à examiner</h2>
                  <p className="mt-1 text-sm text-kelo-muted">
                    Fleur retirée à @{pendingReview.verifier.subjectHandle}. Choisissez pour chaque compte.
                  </p>
                </div>
              </div>

              <div className="mt-5 divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border bg-white">
                {pendingReview.certifications.map((certification) => (
                  <div
                    key={certification.subjectDid}
                    className="flex flex-wrap items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">@{certification.subjectHandle}</p>
                      <p className="truncate text-xs text-kelo-muted">
                        {certification.subjectDid}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => resolveCertification(certification, "keep")}
                        disabled={workingDid === certification.subjectDid}
                        className="rounded-full bg-kelo-gradient px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Conserver
                      </button>
                      <button
                        type="button"
                        onClick={() => resolveCertification(certification, "remove")}
                        disabled={workingDid === certification.subjectDid}
                        className="rounded-full bg-kelo-background px-4 py-2 text-xs font-bold text-kelo-danger disabled:opacity-50"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold">Certificateurs actifs</h2>
                <p className="mt-1 text-sm text-kelo-muted">
                  Une fleur permet uniquement d’attribuer des badges ronds.
                </p>
              </div>
              <span className="rounded-full bg-kelo-background px-3 py-1 text-xs font-bold text-kelo-muted">
                {trustedVerifiers.length}
              </span>
            </div>

            <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border bg-white">
              {loading ? (
                <p className="p-6 text-center text-sm text-kelo-muted">Chargement…</p>
              ) : trustedVerifiers.length > 0 ? (
                trustedVerifiers.map((verifier) => {
                  const count =
                    certificationsByIssuer.get(verifier.subjectDid.toLowerCase())?.length || 0;

                  return (
                    <div
                      key={verifier.subjectDid}
                      className="flex flex-wrap items-center justify-between gap-4 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-kelo-gradient text-white">
                          <BadgeCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold">@{verifier.subjectHandle}</p>
                          <p className="text-xs text-kelo-muted">
                            {count} certification{count > 1 ? "s" : ""} attribuée{count > 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge status="trusted-verifier" />
                        <button
                          type="button"
                          onClick={() => beginRemoval(verifier)}
                          disabled={workingDid === verifier.subjectDid}
                          className="inline-flex items-center gap-2 rounded-full bg-kelo-background px-4 py-2 text-xs font-bold text-kelo-danger disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Retirer la fleur
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-6 text-center text-sm text-kelo-muted">
                  Aucun certificateur de confiance actif.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
