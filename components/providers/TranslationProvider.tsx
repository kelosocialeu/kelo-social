"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_LOCALE,
  TranslationDictionary,
  interpolate,
  isRtlLocale,
  normalizeLocale,
} from "@/lib/i18n";
import {
  getKeloContentPreferences,
  resolvedInterfaceLanguage,
} from "@/lib/kelo-language-preferences";
import { useAuthContext } from "@/components/providers/AuthProvider";

type TranslationContextValue = {
  locale: string;
  loading: boolean;
  t: (key: string, fallback?: string, variables?: Record<string, string | number>) => string;
  reload: () => Promise<void>;
};

const TranslationContext = createContext<TranslationContextValue>({
  locale: DEFAULT_LOCALE,
  loading: false,
  t: (_key, fallback = "") => fallback,
  reload: async () => {},
});

const dictionaries = new Map<string, TranslationDictionary>();

async function loadDictionary(locale: string): Promise<TranslationDictionary> {
  if (dictionaries.has(locale)) return dictionaries.get(locale)!;

  const response = await fetch(`/locales/${encodeURIComponent(locale)}.json`, {
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Locale ${locale} indisponible`);
  const json = (await response.json()) as TranslationDictionary;
  dictionaries.set(locale, json);
  return json;
}

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const { did } = useAuthContext();
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [dictionary, setDictionary] = useState<TranslationDictionary>({});
  const [fallbackDictionary, setFallbackDictionary] = useState<TranslationDictionary>({});
  const [loading, setLoading] = useState(true);

  const resolveLocale = useCallback(() => {
    const prefs = getKeloContentPreferences(did);
    return normalizeLocale(resolvedInterfaceLanguage(prefs.interfaceLanguage));
  }, [did]);

  const reload = useCallback(async () => {
    const requested = resolveLocale();
    setLoading(true);

    try {
      const fallback = await loadDictionary(DEFAULT_LOCALE).catch(() => ({}));
      setFallbackDictionary(fallback);

      let activeLocale = requested;
      let active = fallback;

      try {
        active = requested === DEFAULT_LOCALE ? fallback : await loadDictionary(requested);
      } catch {
        const base = requested.split("-")[0];
        if (base !== requested && base !== DEFAULT_LOCALE) {
          try {
            active = await loadDictionary(base);
            activeLocale = base;
          } catch {
            active = fallback;
            activeLocale = DEFAULT_LOCALE;
          }
        } else {
          active = fallback;
          activeLocale = DEFAULT_LOCALE;
        }
      }

      setDictionary(active);
      setLocale(activeLocale);
      document.documentElement.lang = activeLocale;
      document.documentElement.dir = isRtlLocale(activeLocale) ? "rtl" : "ltr";
    } finally {
      setLoading(false);
    }
  }, [resolveLocale]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const listener = () => void reload();
    window.addEventListener("kelo-content-preferences-changed", listener);
    window.addEventListener("languagechange", listener);
    return () => {
      window.removeEventListener("kelo-content-preferences-changed", listener);
      window.removeEventListener("languagechange", listener);
    };
  }, [reload]);

  const t = useCallback(
    (
      key: string,
      fallback = key,
      variables?: Record<string, string | number>
    ) => {
      const value = dictionary[key] || fallbackDictionary[key] || fallback || key;
      return interpolate(value, variables);
    },
    [dictionary, fallbackDictionary]
  );

  const value = useMemo(
    () => ({ locale, loading, t, reload }),
    [locale, loading, t, reload]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
