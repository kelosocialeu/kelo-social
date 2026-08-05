"use client";

import { useEffect, useRef, useState } from "react";

interface UseHideOnScrollOptions {
  threshold?: number;
  minimumScroll?: number;
}

export function useHideOnScroll({
  threshold = 8,
  minimumScroll = 80,
}: UseHideOnScrollOptions = {}) {
  const [hidden, setHidden] = useState(false);
  const previousScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    previousScrollY.current = window.scrollY;

    const updateVisibility = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const difference =
        currentScrollY - previousScrollY.current;

      if (currentScrollY < minimumScroll) {
        setHidden(false);
        previousScrollY.current = currentScrollY;
        ticking.current = false;
        return;
      }

      if (Math.abs(difference) >= threshold) {
        if (difference > 0) {
          setHidden(true);
        } else {
          setHidden(false);
        }

        previousScrollY.current = currentScrollY;
      }

      ticking.current = false;
    };

    const handleScroll = () => {
      if (ticking.current) {
        return;
      }

      ticking.current = true;

      window.requestAnimationFrame(updateVisibility);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [minimumScroll, threshold]);

  return hidden;
}
