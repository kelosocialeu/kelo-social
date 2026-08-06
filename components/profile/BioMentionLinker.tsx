"use client";

import { useEffect } from "react";

const BIO_SELECTOR =
  "p.whitespace-pre-wrap.leading-relaxed.text-kelo-text";

const MENTION_PATTERN =
  /(^|\s)@([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?)/gi;

function linkifyBio(element: HTMLParagraphElement) {
  if (element.dataset.mentionsLinked === "true") {
    return;
  }

  const text = element.textContent || "";
  const fragment = document.createDocumentFragment();
  const matches = Array.from(text.matchAll(MENTION_PATTERN));
  let lastIndex = 0;

  matches.forEach((match) => {
    const fullMatch = match[0];
    const prefix = match[1] || "";
    const handle = match[2];
    const start = match.index ?? 0;
    const mentionStart = start + prefix.length;

    if (!handle) {
      return;
    }

    if (mentionStart > lastIndex) {
      fragment.append(
        document.createTextNode(
          text.slice(lastIndex, mentionStart)
        )
      );
    }

    const link = document.createElement("a");
    link.href = `/profile/${encodeURIComponent(
      handle.toLowerCase()
    )}`;
    link.textContent = `@${handle}`;
    link.className =
      "font-semibold text-kelo-primary hover:underline";

    fragment.append(link);
    lastIndex = start + fullMatch.length;
  });

  if (lastIndex === 0) {
    element.dataset.mentionsLinked = "true";
    return;
  }

  if (lastIndex < text.length) {
    fragment.append(
      document.createTextNode(text.slice(lastIndex))
    );
  }

  element.replaceChildren(fragment);
  element.dataset.mentionsLinked = "true";
}

function scanProfileBios() {
  document
    .querySelectorAll<HTMLParagraphElement>(BIO_SELECTOR)
    .forEach(linkifyBio);
}

export default function BioMentionLinker() {
  useEffect(() => {
    scanProfileBios();

    const observer = new MutationObserver(() => {
      scanProfileBios();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
