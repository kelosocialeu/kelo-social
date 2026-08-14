"use client";

import { useEffect, useState } from "react";
import { Globe2, Newspaper, Plus, Trash2 } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { getStoredSession } from "@/services/auth.service";
import type { JournalMedia } from "@/lib/atproto/journal";

const CONTINENTS = ["Europe", "Afrique", "Asie", "Amérique du Nord", "Amérique du Sud", "Océanie"];

export default function AdminJournalPage() {
  const { checked, isAdmin } = useIsAdmin();
  const [handle, setHandle] = useState("");
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [mediaHandle, setMediaHandle] = useState("");
  const [international, setInternational] = useState(false);
  const [continents, setContinents] = useState<string[]>([]);
  const [countries, setCountries] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getStoredSession();
    if (session) setHandle(session.handle);
  }, []);

  const loadMedia = async () => {
    try {
      const response = await fetch("/api/journal/media", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger les médias.");
      setMedia(data.media || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger les médias.");
    }
  };

  useEffect(() => {
    if (checked && isAdmin) void loadMedia();
  }, [checked, isAdmin]);

  const toggleContinent = (continent: string) => {
    setContinents((current) =>
      current.includes(continent) ? current.filter((item) => item !== continent) : [...current, continent]
    );
  };

  const addMedia = async (event: React.FormEvent) => {
    event.preventDefault();
    const session = getStoredSession();
    if (!session) return;

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/journal/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          session,
          handle: mediaHandle,
          international,
          continents,
          countries: countries.split(",").map((value) => value.trim()).filter(Boolean),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible d'ajouter ce média.");
      setMediaHandle("");
      setInternational(false);
      setContinents([]);
      setCountries("");
      setMessage("Média ajouté au Journal.");
      await loadMedia();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'ajouter ce média.");
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = async (item: JournalMedia) => {
    const session = getStoredSession();
    if (!session) return;
    setLoading(true);
    try {
      const response = await fetch("/api/journal/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", session, rkey: item.rkey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de retirer ce média.");
      await loadMedia();
      setMessage("Média retiré du Journal.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de retirer ce média.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) return <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">Vérification des droits…</div>;
  if (!isAdmin) return <div className="flex min-h-screen items-center justify-center bg-kelo-background text-kelo-muted">Accès refusé.</div>;

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={logout} />
      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <header className="border-b border-kelo-border px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Newspaper className="h-6 w-6 text-kelo-primary" />
            <div>
              <h1 className="text-2xl font-extrabold">Médias du Journal</h1>
              <p className="text-sm text-kelo-muted">Ajoutez les comptes médias et définissez les zones dans lesquelles ils apparaissent.</p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
          <form onSubmit={addMedia} className="space-y-5 rounded-3xl border border-kelo-border p-5">
            <div>
              <label className="text-sm font-bold">Handle du média</label>
              <input value={mediaHandle} onChange={(e) => setMediaHandle(e.target.value)} required placeholder="ex. nytimes.com" className="mt-2 w-full rounded-2xl border border-kelo-border bg-kelo-background px-4 py-3 outline-none focus:border-kelo-primary" />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-kelo-border p-4">
              <input type="checkbox" checked={international} onChange={(e) => setInternational(e.target.checked)} className="h-5 w-5 accent-kelo-primary" />
              <Globe2 className="h-5 w-5 text-kelo-primary" />
              <div><p className="font-bold">International / Monde</p><p className="text-xs text-kelo-muted">Le média apparaîtra quand l'utilisateur sélectionne Monde.</p></div>
            </label>

            <div>
              <p className="text-sm font-bold">Continents</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CONTINENTS.map((continent) => (
                  <button key={continent} type="button" onClick={() => toggleContinent(continent)} className={`rounded-full border px-3 py-2 text-sm font-semibold ${continents.includes(continent) ? "border-kelo-primary bg-kelo-primary text-white" : "border-kelo-border bg-white"}`}>
                    {continent}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold">Pays</label>
              <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="France, Belgique, Espagne…" className="mt-2 w-full rounded-2xl border border-kelo-border bg-kelo-background px-4 py-3 outline-none focus:border-kelo-primary" />
              <p className="mt-1 text-xs text-kelo-muted">Séparez plusieurs pays par une virgule. Un même média peut être International et rattaché à plusieurs pays.</p>
            </div>

            <button disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-kelo-gradient px-5 py-3 font-bold text-white disabled:opacity-50">
              <Plus className="h-4 w-4" /> Ajouter au Journal
            </button>
          </form>

          {message && <p className="rounded-2xl bg-kelo-background p-4 text-sm text-kelo-muted">{message}</p>}

          <section className="overflow-hidden rounded-3xl border border-kelo-border">
            <div className="border-b border-kelo-border px-5 py-4 font-extrabold">Médias ajoutés ({media.length})</div>
            {media.length === 0 ? (
              <p className="p-8 text-center text-sm text-kelo-muted">Aucun média ajouté pour le moment.</p>
            ) : (
              <div className="divide-y divide-kelo-border">
                {media.map((item) => (
                  <div key={item.rkey} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold">{item.displayName} <span className="font-normal text-kelo-muted">@{item.handle}</span></p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {item.international && <span className="rounded-full bg-kelo-background px-2 py-1">🌍 Monde</span>}
                        {item.continents.map((value) => <span key={value} className="rounded-full bg-kelo-background px-2 py-1">{value}</span>)}
                        {item.countries.map((value) => <span key={value} className="rounded-full bg-kelo-background px-2 py-1">{value}</span>)}
                      </div>
                    </div>
                    <button type="button" onClick={() => void removeMedia(item)} disabled={loading} className="inline-flex items-center gap-2 self-start rounded-full border border-red-200 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-50 sm:self-auto">
                      <Trash2 className="h-4 w-4" /> Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
