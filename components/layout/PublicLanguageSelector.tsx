"use client";

import { Globe2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { useTranslation } from "@/components/providers/TranslationProvider";
import { saveRemoteContentPreferences } from "@/lib/atproto/content-preferences";
import {
  getKeloContentPreferences,
  KELO_INTERFACE_LANGUAGES,
  saveKeloContentPreferences,
} from "@/lib/kelo-language-preferences";

const PUBLIC_ROUTES = new Set(["/", "/login", "/signup"]);

export default function PublicLanguageSelector() {
  const pathname = usePathname();
  const { did } = useAuthContext();
  const { locale, setLanguage, t } = useTranslation();

  if (!PUBLIC_ROUTES.has(pathname)) return null;

  const currentPrefs = getKeloContentPreferences(did);
  const selected = currentPrefs.interfaceLanguage === "auto"
    ? "auto"
    : KELO_INTERFACE_LANGUAGES.some(([code]) => code === currentPrefs.interfaceLanguage)
      ? currentPrefs.interfaceLanguage
      : locale;

  const changeLanguage = (interfaceLanguage: string) => {
    const next = { ...getKeloContentPreferences(did), interfaceLanguage };
    saveKeloContentPreferences(did, next);
    if (did) void saveRemoteContentPreferences(next);
    void setLanguage(interfaceLanguage);
    window.dispatchEvent(new Event("kelo-content-preferences-changed"));
  };

  return (
    <div className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] right-4 z-[100] sm:bottom-auto sm:right-6 sm:top-5">
      <label className="flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/95 px-3 py-2 shadow-lg shadow-violet-200/30 backdrop-blur-xl">
        <Globe2 className="h-4 w-4 shrink-0 text-violet-600" />
        <span className="sr-only">{t("settings.language.title", "Langue de Kelo Social")}</span>
        <select
          value={selected}
          onChange={(event) => changeLanguage(event.target.value)}
          aria-label={t("settings.language.title", "Langue de Kelo Social")}
          className="max-w-[170px] bg-transparent text-sm font-bold text-gray-800 outline-none"
        >
          {KELO_INTERFACE_LANGUAGES.map(([code, label]) => (
            <option key={code} value={code}>
              {code === "auto" ? t("settings.language.auto", label) : label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
