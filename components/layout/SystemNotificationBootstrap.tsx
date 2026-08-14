"use client";

import { useEffect } from "react";

import { registerKeloServiceWorker } from "@/lib/system-notifications";

export default function SystemNotificationBootstrap() {
  useEffect(() => {
    registerKeloServiceWorker().catch((error) => {
      console.warn("Service worker de notifications indisponible :", error);
    });
  }, []);

  return null;
}
