"use client";

import { useEffect } from "react";

/**
 * Loads Twemoji as a visual fallback so modern Unicode emoji remain visible on
 * devices whose operating-system emoji font is too old. Text stays Unicode in
 * AT Protocol; only the browser rendering is replaced with images.
 */
export default function EmojiCompatibility() {
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let cancelled = false;

    const parse = () => {
      const twemoji = (window as any).twemoji;
      if (!twemoji || cancelled) return;
      twemoji.parse(document.body, {
        folder: "svg",
        ext: ".svg",
        className: "kelo-emoji",
        callback: (icon: string) =>
          `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${icon}.svg`,
      });
    };

    const start = () => {
      parse();
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) continue;
            const twemoji = (window as any).twemoji;
            if (!twemoji) continue;
            const target = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
            if (target && !(target as Element).closest?.("img.kelo-emoji")) {
              twemoji.parse(target, {
                folder: "svg",
                ext: ".svg",
                className: "kelo-emoji",
                callback: (icon: string) =>
                  `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${icon}.svg`,
              });
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    if ((window as any).twemoji) {
      start();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@twemoji/api@latest/dist/twemoji.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = start;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, []);

  return null;
}
