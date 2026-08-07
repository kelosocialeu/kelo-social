"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Globe2, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getSessionInfo, updateHandle } from "@/lib/atproto/account";

function normalizeDomain(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^@/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export default function IdentitySection() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [handleInput, setHandleInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSessionInfo()
      .then((info) => {
        setSession(info);
        setHandleInput(info.handle || "");
      })
      .catch((error) => {
        console.error(error);
        setMessage("Impossible de charger votre identité AT Protocol.");
      })
      .finally(() => setLoading(false));
  }, []);

  const domain = useMemo(() => normalizeDomain(handleInput), [handleInput]);
  const did = session?.did || "";
  const dnsValue = did ? `did=${did}` : "did:...";
  const wellKnownValue = did || "did:...";

  const saveHandle = async () => {
    if (!domain) return;
    setSaving(true);
    setMessage(null);

    try {
      await updateHandle(domain);
      const info = await getSessionInfo();
      setSession(info);
      setHandleInput(info.handle || domain);
      setMessage("Votre nom d’utilisateur AT Protocol a été mis à jour.");
    } catch (error) {
      console.error(error);
      setMessage(
        "Le changement a été refusé par votre PDS. Vérifiez que le domaine pointe bien vers votre DID et qu’il n’est pas utilisé par un autre compte."
      );
    } finally {
      setSaving(false);
    }
  };

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
  };

  if (loading) {
    return <p className="p-6 text-sm text-kelo-muted">Chargement...</p>;
  }

  return (
    <div className="flex flex-col gap-7 p-4 sm:p-6">
      <section>
        <h3 className="text-base font-extrabold text-kelo-text">Votre identité AT Protocol</h3>
        <p className="mt-1 text-sm leading-6 text-kelo-muted">
          Votre DID est l’identité permanente de votre compte. Votre nom d’utilisateur peut changer sans modifier ce DID.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-kelo-border bg-kelo-background/50">
          <div className="border-b border-kelo-border p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-kelo-muted">DID permanent</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-sm font-semibold text-kelo-text">{did || "Indisponible"}</code>
              {did && (
                <button type="button" onClick={() => copy(did)} className="rounded-full p-2 text-kelo-muted hover:bg-white" aria-label="Copier le DID">
                  <Copy className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-kelo-muted">Nom d’utilisateur actuel</p>
            <p className="mt-1 text-sm font-bold text-kelo-text">@{session?.handle || "—"}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-kelo-primary" />
          <h3 className="text-base font-extrabold text-kelo-text">Lier votre nom de domaine</h3>
        </div>
        <p className="mt-1 text-sm leading-6 text-kelo-muted">
          Vous pouvez utiliser votre propre domaine comme nom d’utilisateur, par exemple <strong>votrenom.fr</strong>. Le domaine doit d’abord prouver qu’il appartient à votre DID.
        </p>

        <div className="mt-4 rounded-2xl border border-kelo-border p-4">
          <p className="text-sm font-bold text-kelo-text">Méthode DNS recommandée</p>
          <p className="mt-1 text-xs leading-5 text-kelo-muted">
            Ajoutez un enregistrement TXT chez votre fournisseur de domaine.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-kelo-background p-3">
              <p className="text-[11px] font-bold uppercase text-kelo-muted">Nom / hôte</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 break-all text-xs text-kelo-text">_atproto</code>
                <button type="button" onClick={() => copy("_atproto")} className="p-1.5 text-kelo-muted" aria-label="Copier le nom DNS"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="rounded-xl bg-kelo-background p-3">
              <p className="text-[11px] font-bold uppercase text-kelo-muted">Valeur TXT</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-xs text-kelo-text">{dnsValue}</code>
                <button type="button" onClick={() => copy(dnsValue)} className="p-1.5 text-kelo-muted" aria-label="Copier la valeur DNS"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-kelo-border p-4">
          <p className="text-sm font-bold text-kelo-text">Alternative via votre site web</p>
          <p className="mt-1 text-xs leading-5 text-kelo-muted">
            Publiez votre DID en texte brut à l’adresse <code>https://votredomaine/.well-known/atproto-did</code>.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-kelo-background p-3">
            <code className="min-w-0 flex-1 break-all text-xs text-kelo-text">{wellKnownValue}</code>
            <button type="button" onClick={() => copy(wellKnownValue)} className="p-1.5 text-kelo-muted" aria-label="Copier le DID"><Copy className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <h3 className="text-base font-extrabold text-kelo-text">Changer de nom d’utilisateur</h3>
        <p className="mt-1 text-sm leading-6 text-kelo-muted">
          Une fois votre domaine configuré, saisissez-le ici. Votre PDS vérifiera automatiquement qu’il correspond bien à votre DID avant d’accepter le changement.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Input
              value={handleInput}
              onChange={(event) => setHandleInput(event.target.value)}
              placeholder="votredomaine.fr"
              startAdornment="@"
            />
          </div>
          <Button
            variant="secondary"
            className="w-full px-5 sm:w-auto"
            onClick={saveHandle}
            loading={saving}
            disabled={!domain || domain === session?.handle}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Appliquer
          </Button>
        </div>

        {message && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-kelo-background p-3 text-sm text-kelo-muted">
            {message.startsWith("Votre") && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kelo-success" />}
            <span>{message}</span>
          </div>
        )}
      </section>
    </div>
  );
}
