"use client";

import KeloVideoPlayer from "@/components/feed/KeloVideoPlayer";

interface PostEmbedProps {
  embed?: any;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function PostEmbed({ embed }: PostEmbedProps) {
  if (!embed) return null;

  const type = embed.$type;

  if (type === "app.bsky.embed.images#view") {
    const images = embed.images || [];
    if (images.length === 0) return null;
    return (
      <div
        className={`mt-3 grid gap-1 overflow-hidden rounded-2xl border border-kelo-border ${
          images.length > 1 ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {images.map((img: any, i: number) => (
          <img
            key={i}
            src={img.thumb}
            alt={img.alt || ""}
            className="h-full max-h-96 w-full object-cover"
            onClick={(e) => e.stopPropagation()}
          />
        ))}
      </div>
    );
  }

  if (type === "app.bsky.embed.external#view") {
    const ext = embed.external;
    if (!ext?.uri) return null;
    return (
      <a
        href={ext.uri}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-3 block overflow-hidden rounded-2xl border border-kelo-border transition hover:bg-kelo-background/60"
      >
        {ext.thumb && <img src={ext.thumb} alt="" className="h-48 w-full object-cover" />}
        <div className="p-3">
          <p className="truncate text-xs text-kelo-muted">{safeHostname(ext.uri)}</p>
          {ext.title && <p className="mt-0.5 line-clamp-2 text-sm font-bold text-kelo-text">{ext.title}</p>}
          {ext.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-kelo-muted">{ext.description}</p>
          )}
        </div>
      </a>
    );
  }

  if (type === "app.bsky.embed.video#view") {
    if (!embed.playlist) return null;
    return <KeloVideoPlayer src={embed.playlist} poster={embed.thumbnail} />;
  }

  return null;
}
