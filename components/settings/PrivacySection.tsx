"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { downloadRepoArchive, requestAccountDelete, deleteAccount } from "@/lib/atproto/account";

export default function PrivacySection() {
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deleteToken, setDeleteToken] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportMessage(null);
    try {
      await downloadRepoArchive();
      setExportMessage("Téléchargement lancé.");
    } catch (err) {
      console.error(err);
      setExportMessage("Impossible de générer l'archive pour le moment.");
    } finally {
      setExporting(false);
    }
  };

  const handleRequestDelete = async () => {
    setDeleting(true);
    setDeleteMessage(null);
    try {
      await requestAccountDelete();
      setDeleteStep("confirm");
      setDeleteMessage("Un code de confirmation a été envoyé à votre adresse email.");
    } catch (err) {
      console.error(err);
      setDeleteMessage("Impossible de lancer la suppression du compte.");
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirm("Cette action est définitive et irréversible. Confirmer la suppression du compte ?")) return;
    setDeleting(true);
    setDeleteMessage(null);
    try {
      await deleteAccount(deleteToken.trim(), deletePassword);
      alert("Compte supprimé. Vous allez être déconnecté.");
      localStorage.clear();
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      setDeleteMessage("Code ou mot de passe incorrect.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      <section>
        <h3 className="mb-1 text-base font-extrabold text-kelo-text">Visibilité du profil</h3>
        <p className="text-sm text-kelo-muted">
          Par conception, l'AT Protocol est un réseau ouvert : tout compte et toute publication sont visibles
          publiquement par n'importe quel client compatible, connecté ou non. Il n'existe pas de mode "compte privé"
          au niveau du protocole.
        </p>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <h3 className="mb-1 text-base font-extrabold text-kelo-text">Exporter mes données</h3>
        <p className="mb-3 text-sm text-kelo-muted">
          Téléchargez l'archive complète de votre dépôt AT Protocol (format .car), qui vous appartient et reste
          portable vers n'importe quel autre PDS du réseau.
        </p>
        <Button variant="secondary" className="w-auto px-6" onClick={handleExport} loading={exporting}>
          Télécharger mon archive
        </Button>
        {exportMessage && <p className="mt-2 text-sm text-kelo-muted">{exportMessage}</p>}
      </section>

      <section className="border-t border-kelo-border pt-6">
        <h3 className="mb-1 text-base font-extrabold text-kelo-danger">Supprimer mon compte</h3>
        <p className="mb-3 text-sm text-kelo-muted">
          Action définitive et irréversible. Un code de confirmation vous sera envoyé par email.
        </p>

        {deleteStep === "idle" ? (
          <button
            onClick={handleRequestDelete}
            disabled={deleting}
            className="rounded-full border border-kelo-danger px-6 py-2.5 text-sm font-bold text-kelo-danger transition hover:bg-kelo-danger hover:text-white disabled:opacity-50"
          >
            {deleting ? "Envoi..." : "Supprimer mon compte"}
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl border border-kelo-danger/30 bg-kelo-danger/5 p-4">
            <Input label="Code reçu par email" value={deleteToken} onChange={(e) => setDeleteToken(e.target.value)} />
            <Input
              label="Mot de passe"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-full bg-kelo-danger px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Confirmer la suppression définitive"}
              </button>
              <Button variant="secondary" className="w-auto px-6" onClick={() => setDeleteStep("idle")}>
                Annuler
              </Button>
            </div>
          </div>
        )}
        {deleteMessage && <p className="mt-2 text-sm text-kelo-muted">{deleteMessage}</p>}
      </section>
    </div>
  );
}
