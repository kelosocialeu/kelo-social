"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { getKeloContentPreferences, resolvedInterfaceLanguage } from "@/lib/kelo-language-preferences";
import { translateKeloText } from "@/lib/kelo-browser-translate";

const URL_PATTERN = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const MENTION_PATTERN = /(^|\s)@([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?)/gi;

function LinkifiedBio({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, index) => {
        if (!part) return null;
        if (URL_PATTERN.test(part)) {
          URL_PATTERN.lastIndex = 0;
          const href = part.startsWith("http") ? part : `https://${part}`;
          return (
            <a key={`url-${index}`} href={href} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-kelo-primary hover:underline">
              {part}
            </a>
          );
        }

        const mentionParts = part.split(MENTION_PATTERN);
        return mentionParts.map((segment, segmentIndex) => {
          if (segmentIndex % 3 === 2) {
            return (
              <a
                key={`mention-${index}-${segmentIndex}`}
                href={`/profile/${encodeURIComponent(segment.toLowerCase())}`}
                className="font-semibold text-kelo-primary hover:underline"
              >
                @{segment}
              </a>
            );
          }
          return <span key={`text-${index}-${segmentIndex}`}>{segment}</span>;
        });
      })}
    </p>
  );
}

export default function TranslatedText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!text?.trim()) return null;

  async function translate() {
    setLoading(true);
    setError("");
    try {
      const target = resolvedInterfaceLanguage(getKeloContentPreferences().interfaceLanguage);
      const result = await translateKeloText(text, target);
      setTranslated(result.translation);
    } catch {
      setError("Traduction indisponible pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <LinkifiedBio text={translated || text} />
      <button
        type="button"
        onClick={translate}
        disabled={loading}
        className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-kelo-primary hover:bg-kelo-primary/10 disabled:opacity-50"
        aria-label="Traduire ce contenu"
      >
        <Languages className="h-4 w-4" />
        {loading ? "Traduction…" : translated ? "Retraduire" : "Traduire"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
