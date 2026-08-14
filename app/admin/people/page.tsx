"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock3,
  Laptop,
  QrCode,
  RefreshCw,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getStoredSession } from "@/services/auth.service";

type LoginActivityRecord = {
  subjectDid: string;
  subjectHandle: string;
  pdsUrl: string;
  method: "password" | "qr-kelo-id";
  device: string;
  connectedAt: string;
};

function DeviceIcon({ device }: { device: string }) {
  const value = device.toLowerCase();
  if (value === "mobile") return <Smartphone className="h-4 w-4" />;
  if (value === "tablette") return <Tablet className="h-4 w-4" />;
  return <Laptop className="h-4 w-4" />;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function LoginTable({
  title,
  description,
  records,
  qrOnly = false,
}: {
  title: string;
  description: string;
  records: LoginActivityRecord[];
  qrOnly?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-kelo-border bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kelo-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            {qrOnly ? (
              <QrCode className="h-5 w-5 text-kelo-primary" />
            ) : (
              <Users className="h-5 w-5 text-kelo-primary" />
            )}
            <h2 className="text-lg font-extrabold text-kelo-text">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-kelo-muted">{description}</p>
        </div>
        <span className="rounded-full bg-kelo-background px-3 py-1 text-sm font-extrabold text-kelo-primary">
          {records.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-kelo-background text-xs uppercase tracking-wide text-kelo-muted">
            <tr>
              <th className="px-4 py-3 font-bold">Compte</th>
              <th className="px-4 py-3 font-bold">DID</th>
              <th className="px-4 py-3 font-bold">PDS</th>
              <th className="px-4 py-3 font-bold">Méthode</th>
              <th className="px-4 py-3 font-bold">Appareil</th>
              <th className="px-4 py-3 font-bold">Connexion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kelo-border">
            {records.length > 0 ? (
              records.map((record, index) => (
                <tr
                  key={`${record.subjectDid}-${record.connectedAt}-${index}`}
                  className="align-top transition hover:bg-kelo-background/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-bold text-kelo-text">
                    @{record.subjectHandle}
                  </td>
                  <td className="max-w-[280px] px-4 py-3 text-xs text-kelo-muted">
                    <span className="block truncate" title={record.subjectDid}>
                      {record.subjectDid}
                    </span>
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-xs text-kelo-muted">
                    <span className="block truncate" title={record.pdsUrl}>
                      {record.pdsUrl}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        record.method === "qr-kelo-id"
                          ? "bg-violet-100 text-violet-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {record.method === "qr-kelo-id" && <QrCode className="h-3.5 w-3.5" />}
                      {record.method === "qr-kelo-id" ? "QR Kelo ID" : "Mot de passe"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-kelo-muted">
                    <span className="inline-flex items-center gap-2 capitalize">
                      <DeviceIcon device={record.device} />
                      {record.device || "inconnu"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-kelo-muted">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(record.connectedAt)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-kelo-muted">
                  Aucune connexion enregistrée pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminPeoplePage() {
  const router = useRouter();
  const { isAdmin, checked } = useIsAdmin();
  const [handle, setHandle] = useState("");
  const [records, setRecords] = useState<LoginActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (session) setHandle(session.handle);
  }, []);

  const loadActivity = async () => {
    const session = getStoredSession();
    if (!session) {
      setError("Votre session administrateur est introuvable.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger les connexions.");
      }

      setRecords((data.records || []) as LoginActivityRecord[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les connexions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checked) return;
    if (!isAdmin) {
      const timeout = window.setTimeout(() => router.replace("/feed"), 1200);
      return () => window.clearTimeout(timeout);
    }
    void loadActivity();
  }, [checked, isAdmin, router]);

  const qrRecords = useMemo(
    () => records.filter((record) => record.method === "qr-kelo-id"),
    [records]
  );

  const uniquePeople = useMemo(
    () => new Set(records.map((record) => record.subjectDid)).size,
    [records]
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">
        Vérification des droits d’accès...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">
        Accès refusé.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="sticky top-0 z-20 border-b border-kelo-border bg-white/90 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold sm:text-2xl">Personnes</h1>
              <p className="mt-1 text-sm text-kelo-muted">
                Suivi des connexions réussies à Kelo Social.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadActivity()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-kelo-background px-4 py-2 text-sm font-bold transition hover:bg-kelo-border/60 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-kelo-border bg-kelo-background p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-kelo-muted">Personnes uniques</p>
              <p className="mt-2 text-3xl font-extrabold">{uniquePeople}</p>
            </div>
            <div className="rounded-3xl border border-kelo-border bg-kelo-background p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-kelo-muted">Connexions enregistrées</p>
              <p className="mt-2 text-3xl font-extrabold">{records.length}</p>
            </div>
            <div className="rounded-3xl border border-kelo-border bg-kelo-background p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-kelo-muted">Connexions QR Kelo ID</p>
              <p className="mt-2 text-3xl font-extrabold">{qrRecords.length}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {loading && records.length === 0 ? (
            <div className="rounded-3xl border border-kelo-border p-10 text-center text-sm text-kelo-muted">
              Chargement des connexions...
            </div>
          ) : (
            <>
              <LoginTable
                title="Connexions Kelo Social"
                description="Toutes les connexions réussies, quelle que soit la méthode utilisée."
                records={records}
              />

              <LoginTable
                title="Connexions via QR Kelo ID"
                description="Uniquement les comptes ayant ouvert leur session avec un QR Kelo ID."
                records={qrRecords}
                qrOnly
              />
            </>
          )}

          <p className="text-xs leading-relaxed text-kelo-muted">
            Ce tableau n’affiche pas de mot de passe ni de données d’identité Kelo ID. Il utilise uniquement les informations techniques déjà enregistrées après une connexion réussie : compte, DID, PDS, méthode, type d’appareil et date de connexion.
          </p>
        </div>
      </main>
    </div>
  );
}
