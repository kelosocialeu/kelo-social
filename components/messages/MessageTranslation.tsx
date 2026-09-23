"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { getKeloContentPreferences, resolvedInterfaceLanguage } from "@/lib/kelo-language-preferences";
import { translateKeloText } from "@/lib/kelo-browser-translate";

export default function MessageTranslation({ text }: { text: string }) {
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!text?.trim()) return null;

  const translate = async () => {
    setLoading(true);
    setError("");
    try {
      const target = resolvedInterfaceLanguage(
        getKeloContentPreferences().interfaceLanguage
      );
      const result = await translateKeloText(text, target);
      setTranslated(result.translation);
    } catch {
      setError("Traduction indisponible pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-1" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={translate}
        disabled={loading}
        className="inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-[11px] font-bold text-kelo-primary hover:bg-kelo-primary/10 disabled:opacity-50"
      >
        <Languages className="h-3.5 w-3.5" />
        {loading ? "Traduction…" : translated ? "Retraduire" : "Traduire"}
      </button>
      {translated && (
        <div className="mt-1 rounded-xl border border-kelo-border/70 bg-kelo-background/70 p-2.5 text-xs leading-relaxed text-kelo-text">
          {translated}
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
