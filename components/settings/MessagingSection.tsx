"use client";

import { useEffect, useState } from "react";
import { MessageCircleMore, UsersRound } from "lucide-react";
import {
  ChatPermission,
  getMessagingPreferences,
  setMessagingPreferences,
} from "@/lib/atproto/chat";

const OPTIONS: Array<{ value: ChatPermission; label: string; description: string }> = [
  { value: "all", label: "Tout le monde", description: "Tous les comptes peuvent vous contacter." },
  { value: "following", label: "Comptes suivis", description: "Uniquement les comptes que vous suivez." },
  { value: "none", label: "Personne", description: "Aucun nouveau contact n’est autorisé." },
];

function PreferenceBlock({ title, description, icon: Icon, value, onChange, disabled }: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  value: ChatPermission;
  onChange: (value: ChatPermission) => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-2xl border border-kelo-border bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kelo-background"><Icon className="h-5 w-5" /></span>
        <div><h3 className="font-extrabold text-kelo-text">{title}</h3><p className="mt-1 text-sm leading-5 text-kelo-muted">{description}</p></div>
      </div>
      <div className="mt-4 space-y-2">
        {OPTIONS.map((option) => (
          <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${value === option.value ? "border-kelo-primary bg-kelo-primary/5" : "border-kelo-border hover:bg-kelo-background/60"} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
            <input type="radio" name={title} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} disabled={disabled} className="mt-1 h-4 w-4 accent-kelo-primary" />
            <span><span className="block text-sm font-bold text-kelo-text">{option.label}</span><span className="mt-0.5 block text-xs text-kelo-muted">{option.description}</span></span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default function MessagingSection() {
  const [allowIncoming, setAllowIncoming] = useState<ChatPermission>("following");
  const [allowGroupInvites, setAllowGroupInvites] = useState<ChatPermission>("following");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const preferences = await getMessagingPreferences();
        if (cancelled) return;
        setAllowIncoming(preferences.allowIncoming);
        setAllowGroupInvites(preferences.allowGroupInvites);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Impossible de charger les paramètres de messagerie.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const save = async (nextIncoming: ChatPermission, nextGroupInvites: ChatPermission) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await setMessagingPreferences({ allowIncoming: nextIncoming, allowGroupInvites: nextGroupInvites });
      setMessage("Paramètres synchronisés avec AT Protocol.");
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error("Impossible d’enregistrer ces paramètres.");
      setError(saveError.message);
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const changeIncoming = (value: ChatPermission) => {
    const previous = allowIncoming;
    setAllowIncoming(value);
    void save(value, allowGroupInvites).catch(() => setAllowIncoming(previous));
  };

  const changeGroupInvites = (value: ChatPermission) => {
    const previous = allowGroupInvites;
    setAllowGroupInvites(value);
    void save(allowIncoming, value).catch(() => setAllowGroupInvites(previous));
  };

  if (loading) return <div className="p-6 text-sm text-kelo-muted">Chargement des paramètres de messagerie…</div>;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PreferenceBlock title="Autoriser les messages privés de" description="Choisissez qui peut démarrer une nouvelle conversation privée avec vous." icon={MessageCircleMore} value={allowIncoming} onChange={changeIncoming} disabled={saving} />
      <PreferenceBlock title="Autoriser les invitations de groupe de" description="Choisissez qui peut vous inviter dans une conversation de groupe." icon={UsersRound} value={allowGroupInvites} onChange={changeGroupInvites} disabled={saving} />
      {message && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <p className="text-xs leading-5 text-kelo-muted">Ces choix sont enregistrés dans votre déclaration de messagerie AT Protocol et peuvent être reconnus par les applications compatibles.</p>
    </div>
  );
}
