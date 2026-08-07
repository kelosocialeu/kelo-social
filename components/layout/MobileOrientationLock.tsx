"use client";

import { useEffect } from "react";

type LockableOrientation = ScreenOrientation & {
  lock?: (
    orientation: "portrait" | "portrait-primary"
  ) => Promise<void>;
};

export default function MobileOrientationLock() {
  useEffect(() => {
    const isMobileOrTablet = window.matchMedia(
      "(max-width: 1024px), (pointer: coarse)"
    ).matches;

    if (!isMobileOrTablet) {
      return;
    }

    const lockPortrait = async () => {
      const orientation = screen.orientation as
        | LockableOrientation
        | undefined;

      if (!orientation?.lock) {
        return;
      }

      try {
        await orientation.lock("portrait-primary");
      } catch {
        try {
          await orientation.lock("portrait");
        } catch {
          // Certains navigateurs n'autorisent le verrouillage que pour
          // une PWA installée ou en mode plein écran. Le manifeste reste
          // alors la source principale du verrouillage portrait.
        }
      }
    };

    void lockPortrait();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void lockPortrait();
      }
    };

    window.addEventListener("pageshow", lockPortrait);
    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.removeEventListener("pageshow", lockPortrait);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  return null;
}
