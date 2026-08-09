"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, Copy, Globe2, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { getSessionInfo, updateHandle } from "@/lib/atproto/account";
import { getStoredSession } from "@/services/auth.service";

function clean(value: string) {
  return value.trim().replace(/^https?:\/\//i, "").replace(/^@/, "").replace(/\/$/, "").toLowerCase();
}

function pdsDomain() {
  try {
    const session = getStoredSession();
    return session?.pdsUrl ? new URL(session.pdsUrl).hostname : "";
  } catch {
    return "";
  }
}

type Mode = "choice" | "pds" | "domain";
type DomainMethod = "dns" | "web";

export default function IdentitySection() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [mode, setMode] = useState<Mode>("choice");
  const [method, setMethod] = useState<DomainMethod>("dns");
  const [nickname, setNickname] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const suffix = useMemo(() => pdsDomain(), []);
  const domain = clean(domainInput);
  const did = session?.did || "";

  useEffect(() => {
    getSessionInfo().then(setSession).catch(() => setMessage("Impossible de charger votre compte.")).finally(() => setLoading(false));
  }, []);

  const refresh = async () => setSession(await getSessionInfo());

  const apply = async (handle: string) => {
    setSaving(true);
    setMessage(null);
    try {
      await updateHandle(handle);
      await refresh();
      setMessage(`Votre nom d’utilisateur est maintenant @${handle}.`);
      setMode("choice");
    } catch (error) {
      console.error(error);
      setMessage("Ce nom d’utilisateur n’a pas pu être appliqué. Vérifiez qu’il est disponible et correctement configuré.");
    } finally {
      setSaving(false);
    }
  };

  const verifyDomain = async () => {
    if (!domain || !did) return;
    setChecking(true);
    setVerified(false);
    setMessage(null);

    try {
      const response = await fetch("/api/account/verify-handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, did, method }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setMessage(data?.error || "Impossible de vérifier ce domaine pour le moment.");
        return;
      }

      const ok = data.verified === true && data.available === true && data.resolvedDid === did;
      setVerified(ok);

      if (ok) {
        setMessage("Domaine vérifié par AT Protocol et disponible pour votre compte. Vous pouvez continuer.");
      } else {
        setMessage(data.reason || "La vérification n’est pas encore valide. Vérifiez la configuration puis réessayez.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Impossible de vérifier pour le moment. Vérifiez la configuration puis réessayez.");
    } finally {
      setChecking(false);
    }
  };

  const copy = (value: string) => navigator.clipboard?.writeText(value).catch(() => {});

  if (loading) return <p className="p-6 text-sm text-kelo-muted">Chargement...</p>;

  const generatedHandle = nickname && suffix ? `${clean(nickname).split(".")[0]}.${suffix}` : "";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <section>
        <h3 className="text-lg font-extrabold text-kelo-text">Nom d’utilisateur</h3>
        <p className="mt-1 text-sm text-kelo-muted">Actuellement <strong className="text-kelo-text">@{session?.handle || "—"}</strong></p>
      </section>

      {mode === "choice" && (
        <section className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => { setMode("pds"); setMessage(null); }} className="rounded-2xl border border-kelo-border bg-white p-5 text-left transition hover:border-kelo-primary">
            <p className="font-extrabold text-kelo-text">Changer mon pseudo</p>
            <p className="mt-1 text-sm leading-5 text-kelo-muted">Choisissez simplement un nouveau pseudo. Il utilisera le domaine de votre PDS.</p>
            {suffix && <p className="mt-3 text-xs font-bold text-kelo-primary">exemple.{suffix}</p>}
          </button>
          <button type="button" onClick={() => { setMode("domain"); setVerified(false); setMessage(null); }} className="rounded-2xl border border-kelo-border bg-white p-5 text-left transition hover:border-kelo-primary">
            <div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-kelo-primary" /><p className="font-extrabold text-kelo-text">J’ai mon propre nom de domaine</p></div>
            <p className="mt-1 text-sm leading-5 text-kelo-muted">Utilisez votre domaine comme nom d’utilisateur avec une vérification guidée.</p>
          </button>
        </section>
      )}

      {mode === "pds" && (
        <section className="rounded-2xl border border-kelo-border bg-white p-4 sm:p-5">
          <button type="button" onClick={() => setMode("choice")} className="mb-4 flex items-center gap-1 text-sm font-bold text-kelo-muted"><ChevronLeft className="h-4 w-4" /> Retour</button>
          <h4 className="font-extrabold text-kelo-text">Choisissez votre nouveau pseudo</h4>
          <div className="mt-4"><Input value={nickname} onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))} placeholder="votrepseudo" /></div>
          {generatedHandle && <p className="mt-3 rounded-xl bg-kelo-background p-3 text-sm text-kelo-text">Votre nom sera <strong>@{generatedHandle}</strong></p>}
          <Button className="mt-4 w-full sm:w-auto" onClick={() => apply(generatedHandle)} disabled={!generatedHandle} loading={saving}>Continuer avec @{generatedHandle || "votrepseudo"}</Button>
        </section>
      )}

      {mode === "domain" && (
        <section className="rounded-2xl border border-kelo-border bg-white p-4 sm:p-5">
          <button type="button" onClick={() => setMode("choice")} className="mb-4 flex items-center gap-1 text-sm font-bold text-kelo-muted"><ChevronLeft className="h-4 w-4" /> Retour</button>
          <h4 className="font-extrabold text-kelo-text">Utiliser mon propre domaine</h4>
          <p className="mt-1 text-sm text-kelo-muted">Entrez d’abord le domaine que vous voulez utiliser.</p>
          <div className="mt-4"><Input value={domainInput} onChange={(e) => { setDomainInput(e.target.value); setVerified(false); setMessage(null); }} placeholder="monsite.fr" /></div>

          {domain && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold text-kelo-text">Comment voulez-vous le vérifier ?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => { setMethod("dns"); setVerified(false); setMessage(null); }} className={`rounded-xl border p-3 text-left text-sm font-bold ${method === "dns" ? "border-kelo-primary bg-kelo-primary/10 text-kelo-primary" : "border-kelo-border text-kelo-text"}`}>J’ai accès au panneau DNS</button>
                <button type="button" onClick={() => { setMethod("web"); setVerified(false); setMessage(null); }} className={`rounded-xl border p-3 text-left text-sm font-bold ${method === "web" ? "border-kelo-primary bg-kelo-primary/10 text-kelo-primary" : "border-kelo-border text-kelo-text"}`}>Je n’ai pas de panneau DNS</button>
              </div>

              <div className="mt-4 rounded-xl bg-kelo-background p-4">
                {method === "dns" ? <>
                  <p className="text-sm font-bold text-kelo-text">Ajoutez cet enregistrement TXT</p>
                  <p className="mt-3 text-xs text-kelo-muted">Nom / hôte</p><div className="flex items-center gap-2"><code className="flex-1 break-all text-sm text-kelo-text">_atproto</code><button onClick={() => copy("_atproto")}><Copy className="h-4 w-4" /></button></div>
                  <p className="mt-3 text-xs text-kelo-muted">Valeur</p><div className="flex items-center gap-2"><code className="flex-1 break-all text-sm text-kelo-text">did={did}</code><button onClick={() => copy(`did=${did}`)}><Copy className="h-4 w-4" /></button></div>
                </> : <>
                  <p className="text-sm font-bold text-kelo-text">Ajoutez un fichier sur votre site</p>
                  <p className="mt-2 break-all text-xs text-kelo-muted">https://{domain}/.well-known/atproto-did</p>
                  <p className="mt-3 text-xs text-kelo-muted">Contenu du fichier</p><div className="flex items-center gap-2"><code className="flex-1 break-all text-sm text-kelo-text">{did}</code><button onClick={() => copy(did)}><Copy className="h-4 w-4" /></button></div>
                </>}
              </div>

              <Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={verifyDomain} disabled={checking}>{checking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification réelle...</> : "Vérifier l’enregistrement"}</Button>
              {verified && <Button className="mt-2 w-full sm:ml-2 sm:w-auto" onClick={() => apply(domain)} loading={saving}><CheckCircle2 className="mr-2 h-4 w-4" />Continuer avec @{domain}</Button>}
            </div>
          )}
        </section>
      )}

      {message && <p className={`rounded-xl p-3 text-sm ${verified || message.startsWith("Votre") ? "bg-green-500/10 text-green-700" : "bg-kelo-background text-kelo-muted"}`}>{message}</p>}

      <details className="border-t border-kelo-border pt-5 text-sm text-kelo-muted">
        <summary className="cursor-pointer font-bold text-kelo-text">Informations techniques</summary>
        <p className="mt-3">DID permanent : <code className="break-all">{did}</code></p>
      </details>
    </div>
  );
}
