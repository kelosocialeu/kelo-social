"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import KeloVideoPlayer from "@/components/feed/KeloVideoPlayer";

interface PostEmbedProps { embed?: any; }

function safeHostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function PostEmbed({ embed }: PostEmbedProps) {
  const [openImage, setOpenImage] = useState<number | null>(null);
  const images = embed?.$type === "app.bsky.embed.images#view" ? embed.images || [] : [];

  useEffect(() => {
    if (openImage === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenImage(null);
      if (event.key === "ArrowLeft" && images.length > 1) setOpenImage((current) => current === null ? null : (current - 1 + images.length) % images.length);
      if (event.key === "ArrowRight" && images.length > 1) setOpenImage((current) => current === null ? null : (current + 1) % images.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [openImage, images.length]);

  if (!embed) return null;
  const type = embed.$type;

  if (type === "app.bsky.embed.images#view") {
    if (images.length === 0) return null;
    const selected = openImage === null ? null : images[openImage];
    return <>
      <div className={`mt-3 grid gap-1 overflow-hidden rounded-2xl border border-kelo-border ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {images.map((img: any, i: number) => <button key={i} type="button" className="block min-h-0 cursor-zoom-in overflow-hidden bg-black/5" onClick={(e) => { e.stopPropagation(); setOpenImage(i); }} aria-label="Agrandir l’image">
          <img src={img.thumb} alt={img.alt || ""} className="h-full max-h-96 w-full object-cover transition-transform duration-200 hover:scale-[1.01]" />
        </button>)}
      </div>
      {selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Image agrandie" onClick={(e) => { e.stopPropagation(); setOpenImage(null); }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); setOpenImage(null); }} className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70" aria-label="Fermer"><X className="h-6 w-6" /></button>
        {images.length > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); setOpenImage((openImage! - 1 + images.length) % images.length); }} className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 sm:left-6" aria-label="Image précédente"><ChevronLeft className="h-7 w-7" /></button>}
        <img src={selected.fullsize || selected.thumb} alt={selected.alt || ""} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] max-w-[96vw] cursor-default object-contain sm:max-w-[90vw]" />
        {images.length > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); setOpenImage((openImage! + 1) % images.length); }} className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70 sm:right-6" aria-label="Image suivante"><ChevronRight className="h-7 w-7" /></button>}
        {images.length > 1 && <div className="absolute bottom-4 rounded-full bg-black/50 px-3 py-1.5 text-sm font-semibold text-white">{openImage! + 1} / {images.length}</div>}
      </div>}
    </>;
  }

  if (type === "app.bsky.embed.external#view") {
    const ext = embed.external;
    if (!ext?.uri) return null;
    return <a href={ext.uri} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-3 block overflow-hidden rounded-2xl border border-kelo-border transition hover:bg-kelo-background/60">
      {ext.thumb && <img src={ext.thumb} alt="" className="h-48 w-full object-cover" />}
      <div className="p-3"><p className="truncate text-xs text-kelo-muted">{safeHostname(ext.uri)}</p>{ext.title && <p className="mt-0.5 line-clamp-2 text-sm font-bold text-kelo-text">{ext.title}</p>}{ext.description && <p className="mt-0.5 line-clamp-2 text-xs text-kelo-muted">{ext.description}</p>}</div>
    </a>;
  }

  if (type === "app.bsky.embed.video#view") {
    if (!embed.playlist) return null;
    return <KeloVideoPlayer src={embed.playlist} poster={embed.thumbnail} />;
  }
  return null;
}
