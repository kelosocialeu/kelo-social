"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { getStoredSession } from "@/services/auth.service";

export default function RobotAccountSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [keloEnabled, setKeloEnabled] = useState(false);
  const [atprotoEnabled, setAtprotoEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadStatus = async () => {
    const session = getStoredSession();
    if (!session) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/kelo/robot-status?did=${encodeURIComponent(session.did)}&handle=${encodeURIComponent(session.handle)}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      setEnabled(!!data.robot);
      setKeloEnabled(!!data.kelo);
      setAtprotoEnabled(!!data.atproto);
    } catch {
      setMessage("Impossible de vérifier le statut du compte automatisé.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const setRobotStatus = async (nextEnabled: boolean) => {
    const session = getStoredSession();
    if (!session || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/kelo/robot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, enabled: nextEnabled }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Impossible de modifier ce réglage.");

      setEnabled(!!data.robot);
      setKeloEnabled(!!data.kelo);
      setAtprotoEnabled(!!data.atproto);

      if (!nextEnabled && data.atproto) {
        setMessage(
          "Le statut Kelo a été désactivé, mais votre compte reste identifié comme automatisé par Bluesky/AT Protocol."
        );
      } else {
        setMessage(nextEnabled ? "Compte automatisé activé." : "Compte automatisé désactivé.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de modifier ce réglage.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="border-t border-kelo-border px-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-kelo-background text-kelo-primary">
            <Bot className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-kelo-text">Compte automatisé</h3>
            <p className="mt-1 text-sm leading-5 text-kelo-muted">
              Activez cette option si ce compte publie ou agit principalement de manière automatisée. Un logo robot sera affiché sur votre compte dans Kelo Social.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Compte automatisé"
          disabled={loading || saving}
          onClick={() => void setRobotStatus(!keloEnabled)}
          className={`relative mt-1 h-7 w-12 flex-shrink-0 rounded-full transition disabled:opacity-50 ${
            enabled ? "bg-kelo-primary" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-kelo-border bg-kelo-background p-4 text-sm">
        {loading ? (
          <p className="flex items-center gap-2 text-kelo-muted"><RefreshCw className="h-4 w-4 animate-spin" />Synchronisation…</p>
        ) : (
          <div className="space-y-1.5">
            <p className="font-bold text-kelo-text">Statut actuel : {enabled ? "🤖 compte automatisé" : "compte standard"}</p>
            <p className="text-kelo-muted">Kelo Social : {keloEnabled ? "activé" : "désactivé"}</p>
            <p className="text-kelo-muted">Bluesky / AT Protocol : {atprotoEnabled ? "détecté et synchronisé" : "non détecté"}</p>
            {atprotoEnabled && (
              <p className="pt-1 text-xs font-semibold text-kelo-primary">
                La synchronisation AT Protocol est active : tant que Bluesky expose ce statut, le logo robot reste visible sur Kelo Social.
              </p>
            )}
          </div>
        )}
      </div>

      {message && <p className="mt-3 text-sm font-medium text-kelo-muted">{message}</p>}
    </section>
  );
}
