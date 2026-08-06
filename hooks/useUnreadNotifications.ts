"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getUnreadNotificationCount,
} from "@/lib/atproto/notifications";

const REFRESH_MS = 20_000;

export function useUnreadNotifications() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(
        await getUnreadNotificationCount()
      );
    } catch {
      // Le compteur ne doit jamais bloquer la navigation.
    }
  }, []);

  useEffect(() => {
    void refresh();

    const run = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    const interval = window.setInterval(
      run,
      REFRESH_MS
    );

    window.addEventListener("focus", run);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", run);
    };
  }, [refresh]);

  return {
    count,
    refresh,
  };
}
