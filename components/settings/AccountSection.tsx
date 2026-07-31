"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  getSessionInfo,
  updateHandle,
  requestEmailUpdate,
  updateEmail,
  requestPasswordReset,
  resetPassword,
  listAppPasswords,
  createAppPassword,
  revokeAppPassword,
} from "@/lib/atproto/account";

export default function AccountSection() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  const [handleInput, setHandleInput] = useState("");
  const [handleSaving, setHandleSaving] = useState(false);
  const [handleMessage, setHandleMessage] = useState<string | null>(null);

  const [emailStep, setEmailStep] = useState<"idle" | "code">("idle");
  const [newEmail, setNewEmail] = useState("");
  const [emailToken, setEmailToken] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [passwordStep, setPasswordStep] = useState<"idle" | "requested">("idle");
  const [passwordToken, setPasswordToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [appPasswords, setAppPasswords] = useState<any[]>([]);
  const [newAppPasswordName, setNewAppPasswordName] = useState("");
  const [creatingAppPassword, setCreatingAppPassword] = useState(false);
  const [generatedAppPassword, setGeneratedAppPassword] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [info, passwords] = await Promise.all([getSessionInfo(), listAppPasswords()]);
        setSession(info);
        setHandleInput(info.handle);
        setAppPasswords(passwords);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveHandle = async () => {
    setHandleSaving(true);
    setHandleMessage(null);
    try {
      await updateHandle(handleInput.trim());
      setHandleMessage("Nom d'utilisateur mis à jour.");
    } catch (err) {
      console.error(err);
      setHandleMessage("Impossible de mettre à jour le nom d'utilisateur (déjà pris ou invalide).");
    } finally {
      setHandleSaving(false);
    }
  };

  const handleRequestEmailChange = async () => {
    setEmailSaving(true);
    setEmailMessage(null);
    try {
      const tokenRequired = await requestEmailUpdate();
      if (tokenRequired) {
        setEmailStep("code");
        setEmailMessage("Un code de vérification a été envoyé à votre adresse actuelle.");
      } else {
        setEmailStep("code");
        setEmailMessage("Entrez votre nouvelle adresse ci-dessous.");
      }
    } catch (err) {
      console.error(err);
      setEmailMessage("Impossible de lancer le changement d'email.");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    setEmailSaving(true);
    setEmailMessage(null);
    try {
      await updateEmail(newEmail.trim(), emailToken.trim() || undefined);
      setEmailMessage("Adresse email mise à jour.");
      setEmailStep("idle");
      setNewEmail("");
      setEmailToken("");
      const info = await getSessionInfo();
      setSession(info);
    } catch (err) {
      console.error(err);
      setEmailMessage("Code invalide ou expiré.");
    } finally {
      setEmailSaving(false);
    }
  };

  const handleRequestPasswordChange = async () => {
    if (!session?.email) return;
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      await requestPasswordReset(session.email);
      setPasswordStep("requested");
      setPasswordMessage("Un code a été envoyé à votre adresse email.");
    } catch (err) {
      console.error(err);
      setPasswordMessage("Impossible d'envoyer le code.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleConfirmPasswordChange = async () => {
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      await resetPassword(passwordToken.trim(), newPassword);
      setPasswordMessage("Mot de passe mis à jour.");
      setPasswordStep("idle");
      setPasswordToken("");
      setNewPassword("");
    } catch (err) {
      console.error(err);
      setPasswordMessage("Code invalide ou expiré.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCreateAppPassword = async () => {
    if (!newAppPasswordName.trim()) return;
    setCreatingAppPassword(true);
    try {
      const created = await createAppPassword(newAppPasswordName.trim());
      setGeneratedAppPassword(created.password);
      setNewAppPasswordName("");
      const passwords = await listAppPasswords();
      setAppPasswords(passwords);
    } catch (err) {
      console.error(err);
      alert("Impossible de créer ce mot de passe d'application.");
    } finally {
      setCreatingAppPassword(false);
    }
  };

  const handleRevokeAppPassword = async (name: string) => {
    if (!confirm(`Révoquer le mot de passe d'application "${name}" ?`)) return;
    try {
      await revokeAppPassword(name);
      setAppPasswords((prev) => prev.filter((p) => p.name !== name));
    } catch (err) {
      console.error(err);
      alert("Impossible de révoquer ce mot de passe.");
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-kelo-muted">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Nom d'utilisateur */}
      <section>
        <h3 className="mb-3 text-base font-extrabold text-kelo-text">Nom d'utilisateur</h3>
        <div className="flex gap-2">
          <div className="flex-grow">
            <Input value={handleInput} onChange={(e) => setHandleInput(e.target.value)} startAdornment="@" />
          </div>
          <Button
            variant="secondary"
            className="w-auto px-6"
            onClick={handleSaveHandle}
            loading={handleSaving}
            disabled={handleInput.trim() === session?.handle}
          >
            Enregistrer
          </Button>
        </div>
        {handleMessage && <p className="mt-2 text-sm text-kelo-muted">{handleMessage}</p>}
      </section>

      {/* Email */}
      <section className="border-t border-kelo-border pt-6">
        <h3 className="mb-3 text-base font-extrabold text-kelo-text">Adresse email</h3>
        <p className="text-sm text-kelo-text">
          {session?.email || "Aucune adresse enregistrée"}{" "}
          {session?.email && (
            <span className={session.emailConfirmed ? "text-kelo-success" : "text-kelo-warning"}>
              {session.emailConfirmed ? "· confirmée" : "· non confirmée"}
            </span>
          )}
        </p>

        {emailStep === "idle" ? (
          <Button variant="secondary" className="mt-3 w-auto px-6" onClick={handleRequestEmailChange} loading={emailSaving}>
            Changer l'email
          </Button>
        ) : (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-kelo-border bg-kelo-background p-4">
            <Input
              label="Nouvelle adresse email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Input
              label="Code de vérification (si envoyé)"
              value={emailToken}
              onChange={(e) => setEmailToken(e.target.value)}
              placeholder="Laisser vide si aucun code requis"
            />
            <div className="flex gap-2">
              <Button onClick={handleConfirmEmailChange} loading={emailSaving} className="w-auto px-6">
                Confirmer
              </Button>
              <Button variant="secondary" onClick={() => setEmailStep("idle")} className="w-auto px-6">
                Annuler
              </Button>
            </div>
          </div>
        )}
        {emailMessage && <p className="mt-2 text-sm text-kelo-muted">{emailMessage}</p>}
      </section>

      {/* Mot de passe */}
      <section className="border-t border-kelo-border pt-6">
        <h3 className="mb-3 text-base font-extrabold text-kelo-text">Mot de passe</h3>
        <p className="text-sm text-kelo-muted">
          Un code de vérification vous sera envoyé par email pour confirmer le changement.
        </p>

        {passwordStep === "idle" ? (
          <Button
            variant="secondary"
            className="mt-3 w-auto px-6"
            onClick={handleRequestPasswordChange}
            loading={passwordSaving}
            disabled={!session?.email}
          >
            Changer le mot de passe
          </Button>
        ) : (
          <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-kelo-border bg-kelo-background p-4">
            <Input label="Code reçu par email" value={passwordToken} onChange={(e) => setPasswordToken(e.target.value)} />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleConfirmPasswordChange} loading={passwordSaving} className="w-auto px-6">
                Confirmer
              </Button>
              <Button variant="secondary" onClick={() => setPasswordStep("idle")} className="w-auto px-6">
                Annuler
              </Button>
            </div>
          </div>
        )}
        {passwordMessage && <p className="mt-2 text-sm text-kelo-muted">{passwordMessage}</p>}
      </section>

      {/* Mots de passe d'application */}
      <section className="border-t border-kelo-border pt-6">
        <h3 className="mb-1 text-base font-extrabold text-kelo-text">Mots de passe d'application</h3>
        <p className="mb-3 text-sm text-kelo-muted">
          Donnez accès à des applications tierces sans partager votre mot de passe principal.
        </p>

        {generatedAppPassword && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-kelo-primary/30 bg-kelo-primary/10 p-4">
            <div>
              <p className="text-xs font-bold text-kelo-primary">
                Copiez ce mot de passe maintenant — il ne sera plus jamais affiché.
              </p>
              <p className="mt-1 font-mono text-sm text-kelo-text">{generatedAppPassword}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedAppPassword).catch(() => {});
                setGeneratedAppPassword(null);
              }}
              className="flex-shrink-0 rounded-xl bg-kelo-gradient p-2.5 text-white"
              title="Copier"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mb-3 flex gap-2">
          <div className="flex-grow">
            <Input
              placeholder="Nom (ex: Client mobile)"
              value={newAppPasswordName}
              onChange={(e) => setNewAppPasswordName(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            className="w-auto px-6"
            onClick={handleCreateAppPassword}
            loading={creatingAppPassword}
          >
            Créer
          </Button>
        </div>

        <div className="divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border">
          {appPasswords.length > 0 ? (
            appPasswords.map((pw) => (
              <div key={pw.name} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-bold text-kelo-text">{pw.name}</p>
                  <p className="text-xs text-kelo-muted">Créé le {new Date(pw.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => handleRevokeAppPassword(pw.name)}
                  className="text-kelo-muted transition-colors hover:text-kelo-danger"
                  title="Révoquer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="p-4 text-center text-sm text-kelo-muted">Aucun mot de passe d'application créé.</p>
          )}
        </div>
      </section>
    </div>
  );
}
