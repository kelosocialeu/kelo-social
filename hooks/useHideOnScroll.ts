"use client";

import { useEffect, useRef, useState } from "react";

interface UseHideOnScrollOptions {
  /**
   * Position minimale avant de pouvoir masquer la navigation.
   */
  minimumScroll?: number;

  /**
   * Temps d’attente après l’arrêt du défilement
   * avant de faire revenir la barre.
   */
  revealDelay?: number;

  /**
   * Mouvement minimal nécessaire pour considérer
   * que l’utilisateur est réellement en train de défiler.
   */
  movementThreshold?: number;
}

export function useHideOnScroll({
  minimumScroll = 80,
  revealDelay = 300,
  movementThreshold = 3,
}: UseHideOnScrollOptions = {}) {
  const [hidden, setHidden] = useState(false);

  const previousScrollY = useRef(0);
  const revealTimeout = useRef<number | null>(null);
  const frameRequested = useRef(false);

  useEffect(() => {
    previousScrollY.current = Math.max(
      window.scrollY,
      0
    );

    const clearRevealTimeout = () => {
      if (revealTimeout.current !== null) {
        window.clearTimeout(
          revealTimeout.current
        );

        revealTimeout.current = null;
      }
    };

    const scheduleReveal = () => {
      clearRevealTimeout();

      revealTimeout.current =
        window.setTimeout(() => {
          setHidden(false);
          revealTimeout.current = null;
        }, revealDelay);
    };

    const updateNavigation = () => {
      const currentScrollY = Math.max(
        window.scrollY,
        0
      );

      const movement = Math.abs(
        currentScrollY -
          previousScrollY.current
      );

      /*
       * En haut de la page, la navigation doit
       * toujours rester visible.
       */
      if (currentScrollY < minimumScroll) {
        setHidden(false);
        clearRevealTimeout();
        previousScrollY.current =
          currentScrollY;
        frameRequested.current = false;
        return;
      }

      /*
       * Pendant un vrai déplacement, on cache
       * temporairement la barre.
       */
      if (movement >= movementThreshold) {
        setHidden(true);
      }

      /*
       * La barre revient automatiquement lorsque
       * l’utilisateur arrête de faire défiler.
       */
      scheduleReveal();

      previousScrollY.current =
        currentScrollY;

      frameRequested.current = false;
    };

    const handleScroll = () => {
      if (frameRequested.current) {
        return;
      }

      frameRequested.current = true;

      window.requestAnimationFrame(
        updateNavigation
      );
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );

      clearRevealTimeout();
    };
  }, [
    minimumScroll,
    revealDelay,
    movementThreshold,
  ]);

  return hidden;
}
