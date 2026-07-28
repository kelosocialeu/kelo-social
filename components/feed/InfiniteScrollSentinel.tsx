"use client";

import { useEffect, useRef } from "react";

interface Props {
  onIntersect: () => void;
  disabled?: boolean;
}

/**
 * Élément invisible en bas de liste : dès qu'il devient visible à l'écran
 * (l'utilisateur approche du bas), on déclenche le chargement de la page
 * suivante — c'est le mécanisme du scroll infini.
 */
export default function InfiniteScrollSentinel({ onIntersect, disabled }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onIntersect();
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, disabled]);

  return <div ref={ref} className="h-1" />;
}
