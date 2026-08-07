"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Type, Sparkles } from "lucide-react";
import {
  DisplayPreferences,
  KeloTheme,
  TextScale,
  getDisplayPreferences,
  saveDisplayPreferences,
} from "@/lib/display-preferences";

const THEMES: Array<{ key: KeloTheme; label: string; icon: any }> = [
  { key: "system", label: "Automatique", icon: Monitor },
  { key: "light", label: "Clair", icon: Sun },
  { key: "dark", label: "Sombre", icon: Moon },
];

const TEXT_SCALES: Array<{ key: TextScale; label: string }> = [
  { key: "90", label: "Petit" },
  { key: "100", label: "Normal" },
  { key: "110", label: "Grand" },
  { key: "120", label: "Très grand" },
];

export default function DisplaySection() {
  const [prefs, setPrefs] = useState<DisplayPreferences>(() => ({
    theme: "system",
    textScale: "100",
    reduceMotion: false,
  }));

  useEffect(() => {
    setPrefs(getDisplayPreferences());
  }, []);

  const update = (next: Partial<DisplayPreferences>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    saveDisplayPreferences(merged);
  };

  return (
    <div className="flex flex-col gap-7 p-4 sm:p-6">
      <section>
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-kelo-primary" />
          <h3 className="text-base font-extrabold text-kelo-text">Thème</h3>
        </div>
        <p className="mt-1 text-sm text-kelo-muted">
          Choisissez l’apparence de Kelo Social sur cet appareil.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {THEMES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ theme: key })}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-bold transition ${
                prefs.theme === key
                  ? "border-kelo-primary bg-kelo-primary/10 text-kelo-primary"
                  : "border-kelo-border bg-white text-kelo-text hover:bg-kelo-background"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <div className="flex items-center gap-2">
          <Type className="h-5 w-5 text-kelo-primary" />
          <h3 className="text-base font-extrabold text-kelo-text">Taille du texte</h3>
        </div>
        <p className="mt-1 text-sm text-kelo-muted">
          Ajuste la taille générale de l’interface et des publications.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TEXT_SCALES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => update({ textScale: key })}
              className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                prefs.textScale === key
                  ? "border-kelo-primary bg-kelo-primary/10 text-kelo-primary"
                  : "border-kelo-border bg-white text-kelo-text hover:bg-kelo-background"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-kelo-border p-4">
          <div className="flex min-w-0 items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-kelo-primary" />
            <div>
              <p className="text-sm font-bold text-kelo-text">Réduire les animations</p>
              <p className="mt-1 text-xs leading-5 text-kelo-muted">
                Désactive la majorité des animations et transitions pour améliorer le confort visuel.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={prefs.reduceMotion}
            onChange={(event) => update({ reduceMotion: event.target.checked })}
            className="h-5 w-5 shrink-0 accent-kelo-primary"
          />
        </label>
      </section>
    </div>
  );
}
