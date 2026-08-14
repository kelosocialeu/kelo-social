"use client";

import { useEffect, useRef } from "react";

import { useAuthContext } from "@/components/providers/AuthProvider";
import { getNotifications } from "@/lib/atproto/notifications";
import {
  getKeloNotificationPreferences,
  shouldShowNotificationReason,
} from "@/lib/kelo-notification-preferences";
import {
  getLastSystemNotificationMarker,
  getSystemNotificationSupport,
  isSystemNotificationsEnabled,
  setLastSystemNotificationMarker,
  showSystemNotification,
} from "@/lib/system-notifications";

const POLL_INTERVAL_MS = 30_000;

const REASON_TEXT: Record<string, string> = {
  like: "a aimé votre publication",
  repost: "a reposté votre publication",
  follow: "s'est abonné·e à vous",
  mention: "vous a mentionné",
  reply: "a répondu à votre publication",
  quote: "a cité votre publication",
};

function notificationUrl(notification: any) {
  if (notification.reason === "follow") {
    return `/profile/${notification.author?.handle || ""}`;
  }

  const targetUri =
    notification.reason === "like" || notification.reason === "repost"
      ? notification.reasonSubject
      : notification.uri;

  return `/post?uri=${encodeURIComponent(targetUri || "")}`;
}

function notificationBody(notification: any) {
  const actor = notification.author?.displayName || notification.author?.handle || "Quelqu'un";
  const action = REASON_TEXT[notification.reason] || "a interagi avec votre compte";
  const text = String(notification.record?.text || "").trim();
  return text ? `${actor} ${action} : ${text.slice(0, 140)}` : `${actor} ${action}.`;
}

export default function SystemNotificationWatcher() {
  const { checked, did, session } = useAuthContext();
  const busyRef = useRef(false);

  useEffect(() => {
    if (!checked || !session || !did) return;

    let cancelled = false;

    const check = async () => {
      if (cancelled || busyRef.current) return;
      if (!isSystemNotificationsEnabled(did)) return;

      const support = getSystemNotificationSupport();
      if (!support.supported || support.permission !== "granted") return;

      busyRef.current = true;
      try {
        const { items } = await getNotifications(20);
        if (cancelled || items.length === 0) return;

        const sorted = [...items].sort(
          (a: any, b: any) =>
            new Date(a.indexedAt || 0).getTime() - new Date(b.indexedAt || 0).getTime()
        );
        const newestMarker = String(sorted[sorted.length - 1]?.indexedAt || "");
        const previousMarker = getLastSystemNotificationMarker(did);

        // Première synchronisation : mémorise l'état courant sans inonder
        // l'utilisateur d'anciennes notifications.
        if (!previousMarker) {
          if (newestMarker) setLastSystemNotificationMarker(did, newestMarker);
          return;
        }

        const previousTime = new Date(previousMarker).getTime();
        const prefs = getKeloNotificationPreferences(did);
        const fresh = sorted.filter((notification: any) => {
          const indexedTime = new Date(notification.indexedAt || 0).getTime();
          return (
            indexedTime > previousTime &&
            shouldShowNotificationReason(notification.reason, prefs)
          );
        });

        for (const notification of fresh.slice(-5)) {
          await showSystemNotification({
            title: "Kelo Social",
            body: notificationBody(notification),
            url: notificationUrl(notification),
            tag: `kelo-${notification.uri || notification.indexedAt}`,
          });
        }

        if (newestMarker) setLastSystemNotificationMarker(did, newestMarker);
      } catch (error) {
        console.warn("Vérification des notifications système indisponible :", error);
      } finally {
        busyRef.current = false;
      }
    };

    void check();
    const interval = window.setInterval(() => void check(), POLL_INTERVAL_MS);

    const onPreferenceChange = () => void check();
    window.addEventListener("kelo-system-notifications-changed", onPreferenceChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("kelo-system-notifications-changed", onPreferenceChange);
    };
  }, [checked, did, session]);

  return null;
}
