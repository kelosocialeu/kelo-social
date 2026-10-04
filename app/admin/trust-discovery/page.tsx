"use client";

import { useState } from "react";
import { Bot, ExternalLink, Globe2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
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

const categories = [
  ["all", "Tous profils"], ["influencer", "Créateurs / influenceurs"], ["media", "Médias / journalistes"],
  ["enterprise", "Entreprises"], ["association", "Associations / ONG"], ["institution", "Institutions"],
  ["university", "Universités"], ["political", "Partis / personnalités politiques"],
];

export default function TrustDiscoveryPage() {
  const { checked, isAdmin, handle } = useAdminRole();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState("");

  async function scan() {
    setLoading(true); setError("");
    try {
      const session = getStoredSession();
      if (!session) throw new Error("Session introuvable. Reconnectez-vous.");
      const response = await fetch("/api/admin/trust-discovery", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, category, query }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analyse impossible.");
      setCandidates(data.candidates || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse impossible.");
    } finally { setLoading(false); }
  }

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
            <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-kelo-primary" /><div><p className="font-extrabold">Présélection, pas certification automatique</p><p className="mt-1 text-sm text-kelo-muted">Le robot ne certifie jamais. Il recoupe les informations publiques et formule une suggestion argumentée : certification d’un compte, ou certificateur de confiance pour une très grande entité authentifiable.</p></div></div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select value={category} onChange={e => setCategory(e.target.value)} className="rounded-2xl border border-kelo-border bg-white px-4 py-3 text-sm font-bold">{categories.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Recherche libre (ex. Fondation, journaliste…)" className="rounded-2xl border border-kelo-border bg-white px-4 py-3 text-sm" />
              <button onClick={scan} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-full bg-kelo-gradient px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />{loading ? "Analyse…" : "Lancer le robot"}</button>
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.sources.map(source => <a key={source.label + source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-kelo-border px-3 py-1.5 text-xs font-bold"><Globe2 className="h-3.5 w-3.5" />{source.label}<ExternalLink className="h-3 w-3" /></a>)}
                      <a href={"https://bsky.app/profile/" + candidate.handle} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-kelo-background px-3 py-1.5 text-xs font-bold"><ShieldCheck className="h-3.5 w-3.5" />Ouvrir le profil</a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
            {!loading && candidates.length === 0 && <div className="rounded-3xl border border-dashed border-kelo-border p-10 text-center text-sm text-kelo-muted">Lancez une analyse pour rechercher des candidats.</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
