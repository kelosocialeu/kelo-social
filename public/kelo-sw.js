const APP_NAME = "Kelo Social";
const DEFAULT_ICON = "https://kelosocial.sirv.com/logo.png";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = event.notification?.data?.url || "/notifications";
  const targetUrl = new URL(target, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl).catch(() => undefined);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || APP_NAME, {
      body: payload.body || "Vous avez une nouvelle notification.",
      icon: payload.icon || DEFAULT_ICON,
      badge: payload.badge || DEFAULT_ICON,
      tag: payload.tag || "kelo-social",
      renotify: Boolean(payload.renotify),
      data: { url: payload.url || "/notifications" },
    })
  );
});
