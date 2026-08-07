"use client";

import { useEffect } from "react";
import {
  applyDisplayPreferences,
  getDisplayPreferences,
} from "@/lib/display-preferences";

export default function DisplayPreferencesBootstrap() {
  useEffect(() => {
    const apply = () => applyDisplayPreferences(getDisplayPreferences());
    apply();

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handleMedia = () => {
      if (getDisplayPreferences().theme === "system") apply();
    };

    window.addEventListener("kelo-display-preferences-changed", apply);
    media?.addEventListener?.("change", handleMedia);

    return () => {
      window.removeEventListener("kelo-display-preferences-changed", apply);
      media?.removeEventListener?.("change", handleMedia);
    };
  }, []);

  return null;
}
