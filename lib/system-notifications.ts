const SYSTEM_NOTIFICATION_PREFIX = "kelo-system-notifications";
const LAST_NOTIFICATION_PREFIX = "kelo-system-notifications-last";

export type SystemNotificationSupport = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  isIos: boolean;
  isStandalone: boolean;
};

function storageKey(prefix: string, did?: string | null) {
  return `${prefix}:${did || "anonymous"}`;
}

export function getSystemNotificationSupport(): SystemNotificationSupport {
  if (typeof window === "undefined") {
    return { supported: false, permission: "unsupported", isIos: false, isStandalone: false };
  }

  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const supported = "Notification" in window && "serviceWorker" in navigator;

  return {
    supported,
    permission: supported ? Notification.permission : "unsupported",
    isIos,
    isStandalone,
  };
}

export function isSystemNotificationsEnabled(did?: string | null) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(storageKey(SYSTEM_NOTIFICATION_PREFIX, did)) === "true";
}

export function setSystemNotificationsEnabled(did: string | null | undefined, enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(SYSTEM_NOTIFICATION_PREFIX, did), String(enabled));
  window.dispatchEvent(new CustomEvent("kelo-system-notifications-changed"));
}

export async function registerKeloServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/kelo-sw.js", { scope: "/" });
}

export async function requestSystemNotificationPermission() {
  const support = getSystemNotificationSupport();
  if (!support.supported) return "unsupported" as const;

  const registration = await registerKeloServiceWorker();
  const permission = await Notification.requestPermission();
  if (permission === "granted") await registration?.update().catch(() => undefined);
  return permission;
}

export async function showSystemNotification(options: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  const support = getSystemNotificationSupport();
  if (!support.supported || support.permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(options.title, {
    body: options.body,
    icon: "https://kelosocial.sirv.com/logo.png",
    badge: "https://kelosocial.sirv.com/logo.png",
    tag: options.tag || "kelo-social-notification",
    data: { url: options.url || "/notifications" },
  });
  return true;
}

export function getLastSystemNotificationMarker(did?: string | null) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(storageKey(LAST_NOTIFICATION_PREFIX, did));
}

export function setLastSystemNotificationMarker(did: string | null | undefined, marker: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(LAST_NOTIFICATION_PREFIX, did), marker);
}
