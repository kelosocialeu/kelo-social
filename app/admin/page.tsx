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
import { listCertifications, CertificationRecord } from "@/lib/atproto/certifications";

type BadgeStatus = "certified" | "trusted-verifier" | "none";

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, checked } = useIsAdmin();

  const [handle, setHandle] = useState("");
  const [targetHandle, setTargetHandle] = useState("");
  const [status, setStatus] = useState<BadgeStatus>("certified");
  const [certifiedUsers, setCertifiedUsers] = useState<CertificationRecord[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHandle(localStorage.getItem("userHandle") || "");
    refreshList();
  }, []);

  useEffect(() => {
    if (checked && !isAdmin) {
      router.push("/feed");
    }
  }, [checked, isAdmin, router]);

  async function refreshList() {
    setLoadingList(true);
    try {
      const records = await listCertifications();
      setCertifiedUsers(records);
    } catch (err) {
      console.error("Erreur de chargement des certifications :", err);
    } finally {
      setLoadingList(false);
    }
  }

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleAssignBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHandle.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const session = getStoredSession();
      const res = await fetch("/api/admin/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, targetHandle: targetHandle.trim(), status }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'attribution du badge.");
      }

      setTargetHandle("");
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification des droits d'accès...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Accès refusé. Redirection...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="min-h-screen w-full max-w-3xl flex-grow bg-white p-8 shadow-kelo">
          <div className="mb-6 flex items-center justify-between border-b border-kelo-border pb-4">
            <h1 className="text-2xl font-extrabold text-kelo-text">Administration &amp; Certifications</h1>
          </div>

          <p className="mb-6 text-sm text-kelo-muted">
            Les certifications sont publiées dans le dépôt AT Protocol de @kelosocial.eu : elles sont visibles par
            tous les clients du réseau fédéré, pas seulement dans ce panneau.
          </p>

          <form
            onSubmit={handleAssignBadge}
            className="mb-8 flex flex-col gap-4 rounded-2xl border border-kelo-border bg-kelo-background p-6"
          >
            <Input
              label="Identifiant de l'utilisateur (Handle complet)"
              type="text"
              required
              value={targetHandle}
              onChange={(e) => setTargetHandle(e.target.value)}
              placeholder="ex: nom.pds.kelosocial.eu"
            />

            <Select
              label="Rôle / Badge à attribuer"
              value={status}
              onChange={(e) => setStatus(e.target.value as BadgeStatus)}
            >
              <option value="certified">Compte Certifié</option>
              <option value="trusted-verifier">Certificateur de confiance</option>
              <option value="none">Révoquer (Aucun)</option>
            </Select>

            {error && <p className="text-sm font-medium text-kelo-danger">{error}</p>}

            <Button type="submit" loading={submitting} loadingText="Mise à jour...">
              Mettre à jour le statut du compte
            </Button>
          </form>

          <h2 className="mb-4 text-lg font-bold text-kelo-text">Comptes certifiés</h2>
          <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border bg-white">
            {loadingList ? (
              <p className="p-4 text-center text-sm text-kelo-muted">Chargement...</p>
            ) : certifiedUsers.length > 0 ? (
              certifiedUsers.map((user) => (
                <div key={user.subjectDid} className="flex items-center justify-between p-4 text-sm">
                  <span className="font-semibold text-kelo-text">@{user.subjectHandle}</span>
                  <Badge status={user.status} />
                </div>
              ))
            ) : (
              <p className="p-4 text-center text-sm text-kelo-muted">Aucun compte certifié pour l'instant.</p>
            )}
          </div>
        </main>
    </div>
  );
}
