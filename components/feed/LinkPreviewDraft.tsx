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

function detectFirstLink(text: string): string | null {
  const regex = /https?:\/\/[^\s<>"']+|(?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?:\/[^\s<>"']*)?/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = stripTrailingPunctuation(match[0]);
    const previous = match.index > 0 ? text[match.index - 1] : "";
    if (previous === "@") continue;

    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(candidate);
      if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.includes(".")) {
        return parsed.toString();
      }
    } catch {}
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

    setLoading(true);
    setPreview(null);

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/link-preview?url=${encodeURIComponent(detectedUrl)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setPreview({ uri: detectedUrl, title: hostname(detectedUrl), description: "" });
          }
          return;
        }

        const data = await response.json();
        if (cancelled) return;

        setPreview({
          uri: typeof data?.uri === "string" && data.uri ? data.uri : detectedUrl,
          title: typeof data?.title === "string" && data.title ? data.title : hostname(detectedUrl),
          description: typeof data?.description === "string" ? data.description : "",
          image: typeof data?.image === "string" && data.image ? data.image : undefined,
        });
      } catch {
        if (!cancelled) {
          setPreview({ uri: detectedUrl, title: hostname(detectedUrl), description: "" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [detectedUrl, hidden]);

  if (hidden || !detectedUrl) return null;

  if (loading && !preview) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-kelo-border bg-white px-3 py-3 text-sm text-kelo-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de l’aperçu du lien…
      </div>
    );
  }

  if (!preview) return null;

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
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="truncate">{hostname(preview.uri)}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-bold text-kelo-text">{preview.title}</p>
        {preview.description && (
          <p className="mt-1 line-clamp-2 text-xs text-kelo-muted">{preview.description}</p>
        )}
      </div>
    </a>
  );
}
