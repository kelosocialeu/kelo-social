export type TranslationDictionary = Record<string, string>;

export const DEFAULT_LOCALE = "fr";

export const RTL_LOCALES = new Set(["ar", "fa", "he", "ur"]);

export function normalizeLocale(locale?: string | null): string {
  if (!locale) return DEFAULT_LOCALE;
  const clean = locale.trim();
  if (!clean) return DEFAULT_LOCALE;
  return clean;
}

export function isRtlLocale(locale: string): boolean {
  return RTL_LOCALES.has(locale.split("-")[0].toLowerCase());
}

export function interpolate(
  value: string,
  variables?: Record<string, string | number>
): string {
  if (!variables) return value;
  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const next = variables[key];
    return next === undefined || next === null ? match : String(next);
  });
}
