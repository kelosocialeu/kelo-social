"use client";

import { useEffect, useState } from "react";
import { Globe2, Languages, Sparkles } from "lucide-react";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useTranslation } from "@/components/providers/TranslationProvider";
import { getKeloContentPreferences, saveKeloContentPreferences, KELO_INTERESTS, KELO_LANGUAGES, KeloContentPreferences } from "@/lib/kelo-language-preferences";

export default function LanguageContentSection() {
  const { did } = useAuthContext();
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<KeloContentPreferences>({ interfaceLanguage: "auto", postLanguages: [], interests: [] });
  useEffect(() => setPrefs(getKeloContentPreferences(did)), [did]);
  const save = (next: KeloContentPreferences) => { setPrefs(next); saveKeloContentPreferences(did, next); window.dispatchEvent(new Event("kelo-content-preferences-changed")); };
  const toggle = (field: "postLanguages" | "interests", value: string) => save({ ...prefs, [field]: prefs[field].includes(value) ? prefs[field].filter(v => v !== value) : [...prefs[field], value] });

  return <div className="flex flex-col gap-8 p-4 sm:p-6">
    <section><div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-kelo-primary"/><h3 className="font-extrabold">{t("settings.language.title", "Langue de Kelo Social")}</h3></div>
      <p className="mt-1 text-sm text-kelo-muted">{t("settings.language.description", "Choisissez la langue d’affichage. Automatique utilise la langue de votre appareil.")}</p>
      <select value={prefs.interfaceLanguage} onChange={e=>save({...prefs,interfaceLanguage:e.target.value})} className="mt-4 w-full rounded-xl border border-kelo-border bg-white p-3 text-sm">
        {KELO_LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}
      </select>
    </section>
    <section className="border-t border-kelo-border pt-6"><div className="flex items-center gap-2"><Languages className="h-5 w-5 text-kelo-primary"/><h3 className="font-extrabold">{t("settings.postLanguages.title", "Langues des publications")}</h3></div>
      <p className="mt-1 text-sm text-kelo-muted">{t("settings.postLanguages.description", "Sélectionnez une ou plusieurs langues à privilégier dans votre fil. Sans sélection, toutes les langues restent autorisées.")}</p>
      <div className="mt-4 flex max-h-72 flex-wrap gap-2 overflow-y-auto rounded-2xl border border-kelo-border p-3">{KELO_LANGUAGES.filter(([c])=>c!=="auto").map(([code,label])=><button key={code} type="button" onClick={()=>toggle("postLanguages",code)} className={`rounded-full border px-3 py-2 text-xs font-bold ${prefs.postLanguages.includes(code)?"border-kelo-primary bg-kelo-primary/10 text-kelo-primary":"border-kelo-border"}`}>{label}</button>)}</div>
    </section>
    <section className="border-t border-kelo-border pt-6"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-kelo-primary"/><h3 className="font-extrabold">{t("settings.interests.title", "Centres d’intérêt")}</h3></div>
      <p className="mt-1 text-sm text-kelo-muted">{t("settings.interests.description", "Ces choix permettent à Kelo Social de privilégier les publications qui correspondent à vos intérêts.")}</p>
      <div className="mt-4 flex flex-wrap gap-2">{KELO_INTERESTS.map(item=><button key={item} type="button" onClick={()=>toggle("interests",item)} className={`rounded-full border px-3 py-2 text-xs font-bold ${prefs.interests.includes(item)?"border-kelo-primary bg-kelo-primary/10 text-kelo-primary":"border-kelo-border"}`}>{item}</button>)}</div>
    </section>
  </div>;
}
