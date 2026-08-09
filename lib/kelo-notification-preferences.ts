export interface KeloNotificationPreferences {
  like: boolean;
  repost: boolean;
  follow: boolean;
  mention: boolean;
  reply: boolean;
  quote: boolean;
}

export const DEFAULT_KELO_NOTIFICATION_PREFERENCES: KeloNotificationPreferences = {
  like: true,
  repost: true,
  follow: true,
  mention: true,
  reply: true,
  quote: true,
};

function storageKey(did: string) {
  return `kelo.notification-preferences:${did || "anonymous"}`;
}

export function getKeloNotificationPreferences(did: string): KeloNotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_KELO_NOTIFICATION_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(storageKey(did));
    if (!raw) return DEFAULT_KELO_NOTIFICATION_PREFERENCES;

    return {
      ...DEFAULT_KELO_NOTIFICATION_PREFERENCES,
      ...(JSON.parse(raw) as Partial<KeloNotificationPreferences>),
    };
  } catch {
    return DEFAULT_KELO_NOTIFICATION_PREFERENCES;
  }
}

export function saveKeloNotificationPreferences(
  did: string,
  prefs: KeloNotificationPreferences
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(did), JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("kelo-notification-preferences-changed"));
}

export function shouldShowNotificationReason(
  reason: string,
  prefs: KeloNotificationPreferences
): boolean {
  if (reason in prefs) {
    return prefs[reason as keyof KeloNotificationPreferences];
  }
  return true;
}
