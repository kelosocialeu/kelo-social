"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Sun, Monitor, Type, Sparkles, Palette } from "lucide-react";
import {
  DisplayPreferences,
  KeloTheme,
  TextScale,
  KeloPalette,
  KELO_PALETTES,
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

const GRADIENT_PALETTES: Array<{ key: KeloPalette; label: string; description: string }> = [
  { key: "default", label: "Kelo Social", description: "Palette originale · par défaut" },
  { key: "violet-cyan", label: "Violet & Cyan", description: "Violet, bleu électrique et cyan" },
  { key: "rose-sunset", label: "Rose Sunset", description: "Rose, magenta, violet et orange" },
  { key: "blue-green", label: "Bleu & Émeraude", description: "Bleu, turquoise et vert" },
  { key: "prism", label: "Prisme", description: "Rose, violet, bleu et cyan" },
];

const CLASSIC_PALETTES: Array<{ key: KeloPalette; label: string }> = [
  { key: "classic-blue", label: "Bleu" },
  { key: "classic-violet", label: "Violet" },
  { key: "classic-green", label: "Vert" },
  { key: "classic-rose", label: "Rose" },
  { key: "classic-orange", label: "Orange" },
  { key: "classic-red", label: "Rouge" },
  { key: "classic-black", label: "Noir" },
];

export default function DisplaySection() {
  const [prefs, setPrefs] = useState<DisplayPreferences>(() => ({ theme: "system", textScale: "100", reduceMotion: false, palette: "default" }));

  useEffect(() => { setPrefs(getDisplayPreferences()); }, []);

  const update = (next: Partial<DisplayPreferences>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    saveDisplayPreferences(merged);
  };

  return (
    <div className="flex flex-col gap-7 p-4 sm:p-6">
      <section>
        <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-kelo-primary" /><h3 className="text-base font-extrabold text-kelo-text">Palette de couleurs</h3></div>
        <p className="mt-1 text-sm leading-6 text-kelo-muted">Choisissez un dégradé Kelo ou une couleur classique unie. La couleur choisie s’applique aussi aux noms d’utilisateur, mentions et hashtags.</p>

        <h4 className="mt-5 text-sm font-extrabold text-kelo-text">Dégradés</h4>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GRADIENT_PALETTES.map(({ key, label, description }) => {
            const selected = prefs.palette === key; const palette = KELO_PALETTES[key];
            return <button key={key} type="button" onClick={() => update({ palette: key })} aria-pressed={selected} className={`overflow-hidden rounded-2xl border bg-white text-left transition ${selected ? "border-kelo-primary ring-2 ring-kelo-primary/20" : "border-kelo-border hover:border-kelo-primary/50"}`}>
              <span className="relative block h-24 w-full" style={{ background: palette.gradient }}>{selected && <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-kelo-primary shadow-md"><Check className="h-4 w-4" /></span>}</span>
              <span className="block p-3.5"><span className="block text-sm font-extrabold text-kelo-text">{label}</span><span className="mt-1 block text-xs leading-5 text-kelo-muted">{description}</span></span>
            </button>;
          })}
        </div>

        <h4 className="mt-6 text-sm font-extrabold text-kelo-text">Couleurs classiques</h4>
        <p className="mt-1 text-xs leading-5 text-kelo-muted">Pour une interface plus sobre, sans dégradé.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {CLASSIC_PALETTES.map(({ key, label }) => {
            const selected = prefs.palette === key; const palette = KELO_PALETTES[key];
            return <button key={key} type="button" onClick={() => update({ palette: key })} aria-pressed={selected} className={`flex min-h-16 items-center gap-3 rounded-2xl border bg-white p-3 text-left transition ${selected ? "border-kelo-primary ring-2 ring-kelo-primary/20" : "border-kelo-border hover:border-kelo-primary/50"}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: palette.primary }}>{selected && <Check className="h-4 w-4 text-white" />}</span>
              <span className="text-sm font-bold text-kelo-text">{label}</span>
            </button>;
          })}
        </div>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <div className="flex items-center gap-2"><Sun className="h-5 w-5 text-kelo-primary" /><h3 className="text-base font-extrabold text-kelo-text">Thème</h3></div>
        <p className="mt-1 text-sm text-kelo-muted">Choisissez l’apparence claire ou sombre de Kelo Social sur cet appareil.</p>
        <div className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">{THEMES.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => update({ theme: key })} className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-sm font-bold transition ${prefs.theme === key ? "border-kelo-primary bg-kelo-primary/10 text-kelo-primary" : "border-kelo-border bg-white text-kelo-text hover:bg-kelo-background"}`}><Icon className="h-5 w-5" />{label}</button>)}</div>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <div className="flex items-center gap-2"><Type className="h-5 w-5 text-kelo-primary" /><h3 className="text-base font-extrabold text-kelo-text">Taille du texte</h3></div>
        <p className="mt-1 text-sm text-kelo-muted">Ajuste la taille générale de l’interface et des publications.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{TEXT_SCALES.map(({ key, label }) => <button key={key} type="button" onClick={() => update({ textScale: key })} className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${prefs.textScale === key ? "border-kelo-primary bg-kelo-primary/10 text-kelo-primary" : "border-kelo-border bg-white text-kelo-text hover:bg-kelo-background"}`}>{label}</button>)}</div>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-kelo-border p-4"><div className="flex min-w-0 items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-kelo-primary" /><div><p className="text-sm font-bold text-kelo-text">Réduire les animations</p><p className="mt-1 text-xs leading-5 text-kelo-muted">Désactive la majorité des animations et transitions pour améliorer le confort visuel.</p></div></div><input type="checkbox" checked={prefs.reduceMotion} onChange={(event) => update({ reduceMotion: event.target.checked })} className="h-5 w-5 shrink-0 accent-kelo-primary" /></label>
      </section>
    </div>
  );
}
