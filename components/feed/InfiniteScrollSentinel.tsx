"use client";

import { useEffect, useRef } from "react";

interface InfiniteScrollSentinelProps {
  onIntersect: () => void;
  disabled?: boolean;

  /**
   * Distance avant le bas de la liste à laquelle la prochaine page
   * commence à être chargée.
   *
   * Par défaut :
   * - mobile : environ 1 200 px ;
   * - tablette : environ 1 600 px ;
   * - ordinateur : environ 2 000 px.
   */
  preloadDistance?: number;
}

/**
 * Déclenche le préchargement de la page suivante avant que l’utilisateur
 * n’atteigne réellement le bas du fil.
 *
 * Le chargement se déroule ainsi en arrière-plan pendant que l’utilisateur
 * lit encore les publications déjà affichées.
 */
export default function InfiniteScrollSentinel({
  onIntersect,
  disabled = false,
  preloadDistance,
}: InfiniteScrollSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onIntersect);
  const requestPendingRef = useRef(false);

  useEffect(() => {
    callbackRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    if (disabled) {
      requestPendingRef.current = false;
      return;
    }

    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const getResponsivePreloadDistance = () => {
      if (typeof preloadDistance === "number") {
        return preloadDistance;
      }

      const width = window.innerWidth;

      if (width < 768) {
        return 1200;
      }

      if (width < 1280) {
        return 1600;
      }

      return 2000;
    };

    const triggerLoad = () => {
      if (requestPendingRef.current || disabled) {
        return;
      }

      requestPendingRef.current = true;

      Promise.resolve(callbackRef.current()).finally(() => {
        /*
         * Petit délai empêchant IntersectionObserver de déclencher plusieurs
         * appels rapprochés avant que React ait actualisé `disabled`.
         */
        window.setTimeout(() => {
          requestPendingRef.current = false;
        }, 150);
      });
    };

    let observer: IntersectionObserver | null = null;

    const createObserver = () => {
      observer?.disconnect();

      const distance = getResponsivePreloadDistance();

      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (entry?.isIntersecting) {
            triggerLoad();
          }
        },
        {
          root: null,
          rootMargin: `0px 0px ${distance}px 0px`,
          threshold: 0,
        }
      );

      observer.observe(sentinel);
    };

    createObserver();

    /*
     * Si la fenêtre passe du mode téléphone au mode tablette ou PC,
     * la distance de préchargement est recalculée.
     */
    const handleResize = () => {
      createObserver();
    };

    window.addEventListener("resize", handleResize, {
      passive: true,
    });

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
      requestPendingRef.current = false;
    };
  }, [disabled, preloadDistance]);

  return (
    <div
      ref={sentinelRef}
      aria-hidden="true"
      className="h-px w-full"
    />
  );
}
