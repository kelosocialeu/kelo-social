"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

type PreviewData = {
  uri: string;
  title: string;
  description: string;
  image?: string;
};

function stripTrailingPunctuation(value: string) {
  return value.replace(/[.,!?;:)}\]]+$/g, "");
}

function normalizeCandidate(rawValue: string): string | null {
  const raw = stripTrailingPunctuation(rawValue.trim());
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function detectFirstLink(text: string): string | null {
  // Les URL complètes sont traitées en priorité. Cette détection accepte les
  // chemins, paramètres (?x=y), ancres (#section) et domaines Unicode encodés.
  const fullUrl = text.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (fullUrl) {
    const normalized = normalizeCandidate(fullUrl);
    if (normalized) return normalized;
  }

  // Ensuite on cherche les domaines écrits sans protocole, par ex. example.com/path.
  // On découpe le texte en jetons pour éviter qu'une regex trop stricte rate
  // certains liens légitimes collés dans le compositeur.
  const tokens = text.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const cleaned = stripTrailingPunctuation(token.replace(/^[([{<"']+/, ""));
    if (!cleaned || cleaned.includes("@")) continue;
    if (!/^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,63}(?:[/:?#].*)?$/i.test(cleaned)) {
      continue;
    }
    const normalized = normalizeCandidate(cleaned);
    if (normalized) return normalized;
  }

  return null;
}

function hostname(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export default function LinkPreviewDraft({ text, hidden = false }: { text: string; hidden?: boolean }) {
  const detectedUrl = useMemo(() => detectFirstLink(text), [text]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!detectedUrl || hidden) {
      setPreview(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    // Affiche immédiatement une carte dès qu'un lien est reconnu. Les
    // métadonnées viennent l'enrichir ensuite, mais une panne du serveur de
    // preview ne peut plus rendre la détection invisible.
    setPreview({
      uri: detectedUrl,
      title: hostname(detectedUrl),
      description: "",
    });
    setLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(detectedUrl)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();
        if (cancelled) return;

        setPreview({
          uri: typeof data?.uri === "string" && data.uri ? data.uri : detectedUrl,
          title: typeof data?.title === "string" && data.title ? data.title : hostname(detectedUrl),
          description: typeof data?.description === "string" ? data.description : "",
          image: typeof data?.image === "string" && data.image ? data.image : undefined,
        });
      } catch {
        // La carte minimale reste affichée si les métadonnées sont indisponibles.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [detectedUrl, hidden]);

  if (hidden || !detectedUrl || !preview) return null;

  return (
    <a
      href={preview.uri}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="mt-3 block overflow-hidden rounded-2xl border border-kelo-border bg-white transition hover:bg-kelo-background/60"
    >
      {preview.image && (
        <img src={preview.image} alt="" className="h-44 w-full object-cover" />
      )}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-xs text-kelo-muted">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ExternalLink className="h-3.5 w-3.5" />
          )}
          <span className="truncate">{hostname(preview.uri)}</span>
          {loading && <span className="ml-1">Chargement…</span>}
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-bold text-kelo-text">{preview.title}</p>
        {preview.description && (
          <p className="mt-1 line-clamp-2 text-xs text-kelo-muted">{preview.description}</p>
        )}
      </div>
    </a>
  );
}
