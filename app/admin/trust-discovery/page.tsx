"use client";

import { useEffect, useState } from "react";
import { Bot, Check, ExternalLink, Globe2, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Badge from "@/components/ui/Badge";
import { useAdminRole } from "@/hooks/useAdminRole";
import { getStoredSession } from "@/services/auth.service";

type Candidate = {
  did: string; handle: string; displayName: string; description?: string; avatar?: string;
  score: number; confidence: "high" | "medium" | "low";
  reasons: string[]; officialWebsite?: string;
  recommendation: "certification" | "trusted-certifier"; recommendationTitle: string; recommendationSummary: string;
  sources: { label: string; url: string; result: "positive" | "neutral" | "negative" }[];
};

export default function TrustDiscoveryPage() {
  const { checked, isAdmin, handle } = useAdminRole();
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState("");

  async function decideCandidate(candidate: Candidate, decision: "certify" | "trusted-verifier" | "reject") {
    try {
      const session = getStoredSession();
      if (!session) throw new Error("Session introuvable. Reconnectez-vous.");

      if (decision !== "reject") {
        const status = decision === "trusted-verifier" ? "trusted-verifier" : "certified";
        const response = await fetch("/api/admin/certify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, targetDid: candidate.did, targetHandle: candidate.handle, status }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Certification impossible.");
      }

      const memoryDecision = decision === "reject"
        ? "rejected"
        : decision === "trusted-verifier"
          ? "trusted-certifier"
          : "certified";

      const decisionResponse = await fetch("/api/admin/trust-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, mode: "decision", did: candidate.did, decision: memoryDecision }),
      });
      const decisionData = await decisionResponse.json();
      if (!decisionResponse.ok) throw new Error(decisionData.error || "Impossible de mémoriser la décision.");

      setCandidates(current => current.filter(item => item.did !== candidate.did));
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    }
  }

  async function loadSuggestions() {
    try {
      const session = getStoredSession();
      if (!session) throw new Error("Session introuvable. Reconnectez-vous.");
      const response = await fetch("/api/admin/trust-discovery", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, mode: "list" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chargement impossible.");
      const eligible = (data.candidates || []).filter((candidate: Candidate) =>
        candidate.confidence === "high" &&
        candidate.score >= (candidate.recommendation === "trusted-certifier" ? 85 : 70)
      );
      setCandidates(eligible);
      setLastUpdate(new Date());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!checked || !isAdmin) return;
    void loadSuggestions();
    const timer = window.setInterval(() => void loadSuggestions(), 30000);
    return () => window.clearInterval(timer);
  }, [checked, isAdmin]);

  if (!checked || !isAdmin) return <div className="flex min-h-screen items-center justify-center bg-kelo-background text-sm text-kelo-muted">Vérification des droits…</div>;

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={() => { localStorage.clear(); window.location.href = "/login"; }} />
      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="border-b border-kelo-border bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kelo-gradient text-white"><Bot className="h-6 w-6" /></div>
              <div><h1 className="text-xl font-extrabold sm:text-2xl">Robot de découverte des comptes</h1><p className="mt-1 text-sm text-kelo-muted">Recherche AT Protocol + vérification de sources publiques sur Internet.</p></div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-kelo-border bg-kelo-background p-5">
            <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-kelo-primary" /><div><p className="font-extrabold">Veille AT Protocol autonome</p><p className="mt-1 text-sm text-kelo-muted">Le robot tourne automatiquement sur le serveur et surveille le flux AT Protocol en continu. Il vérifie d’abord si le DID est déjà certifié par Kelo Social : dans ce cas, il l’ignore. Sinon, il recoupe les signaux AT Protocol et les sources publiques sur Internet.</p></div></div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-kelo-muted">
              <span className="rounded-full bg-white px-3 py-1.5">Surveillance automatique</span>
              <span className="rounded-full bg-white px-3 py-1.5">Certifications Kelo ignorées</span>
              <span className="rounded-full bg-white px-3 py-1.5">Aucune certification automatique</span>
              {lastUpdate && <span>Dernière actualisation : {lastUpdate.toLocaleTimeString("fr-BE")}</span>}
              <button onClick={() => void loadSuggestions()} className="ml-auto inline-flex items-center gap-2 rounded-full border border-kelo-border bg-white px-4 py-2 font-extrabold"><RefreshCw className="h-4 w-4" />Actualiser</button>
            </div>
          </section>

          {error && <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-kelo-danger">{error}</p>}

          <section className="space-y-3">
            {candidates.map(candidate => (
              <article key={candidate.did} className="rounded-3xl border border-kelo-border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start gap-4">
                  {candidate.avatar ? <img src={candidate.avatar} alt="" className="h-14 w-14 rounded-full object-cover" /> : <div className="h-14 w-14 rounded-full bg-kelo-background" />}
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 rounded-2xl border border-kelo-border bg-kelo-background p-3"><p className="text-sm font-extrabold">{candidate.recommendationTitle}</p><p className="mt-1 text-sm text-kelo-muted">{candidate.recommendationSummary}</p></div><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold">{candidate.displayName}</h2><span className="text-sm text-kelo-muted">@{candidate.handle}</span><span className="rounded-full bg-kelo-background px-2.5 py-1 text-xs font-extrabold">{candidate.score}/100</span><span className="rounded-full px-2.5 py-1 text-xs font-extrabold">{candidate.confidence === "high" ? "Confiance élevée" : candidate.confidence === "medium" ? "À examiner" : "Faible confiance"}</span></div>
                    {candidate.description && <p className="mt-2 text-sm text-kelo-muted">{candidate.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">{candidate.reasons.map(reason => <span key={reason} className="rounded-full bg-kelo-background px-3 py-1.5 text-xs font-semibold">{reason}</span>)}</div>
                    <div className="mt-4 rounded-2xl border border-kelo-border bg-kelo-background p-4">
                      <p className="text-sm font-extrabold">Pourquoi le robot recommande ce compte</p>
                      <p className="mt-1 text-sm leading-6 text-kelo-muted">{candidate.recommendationSummary}</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.sources.map(source => <a key={source.label + source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-kelo-border px-3 py-1.5 text-xs font-bold"><Globe2 className="h-3.5 w-3.5" />{source.label}<ExternalLink className="h-3 w-3" /></a>)}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-kelo-border pt-4">
                      <button onClick={() => void decideCandidate(candidate, "reject")} className="inline-flex items-center gap-2 rounded-full border border-kelo-border bg-white px-4 py-2 text-xs font-extrabold text-kelo-muted"><X className="h-4 w-4" />Refuser</button>
                      <button onClick={() => { window.location.href = "/profile/" + encodeURIComponent(candidate.handle); }} className="inline-flex items-center gap-2 rounded-full border border-kelo-border bg-white px-4 py-2 text-xs font-extrabold"><ShieldCheck className="h-4 w-4" />Aller vers le profil</button>
                      <button onClick={() => void decideCandidate(candidate, candidate.recommendation === "trusted-certifier" ? "trusted-verifier" : "certify")} className="inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-4 py-2 text-xs font-extrabold text-white">
                        <Check className="h-4 w-4" />{candidate.recommendation === "trusted-certifier" ? "Accorder la certification pour certificateur de confiance" : "Accorder la certification"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!loading && candidates.length === 0 && <div className="rounded-3xl border border-dashed border-kelo-border p-10 text-center text-sm text-kelo-muted">Le robot n’a pas encore produit de suggestion. Il continue sa veille automatiquement.</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
