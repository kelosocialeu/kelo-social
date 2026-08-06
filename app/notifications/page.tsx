"use client";

import {
  useCallback,
  useEffect,
} from "react";
import Link from "next/link";

import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import AccountBadges from "@/components/ui/AccountBadges";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";

import {
  getNotifications,
  markNotificationsSeen,
} from "@/lib/atproto/notifications";

const NOTIFICATION_REFRESH_MS = 20_000;

const REASON_LABELS: Record<string, string> = {
  like: "a aimé votre publication",
  repost: "a reposté votre publication",
  follow: "s'est abonné·e à vous",
  mention: "vous a mentionné",
  reply: "a répondu à votre publication",
  quote: "a cité votre publication",
};

const REASON_ICONS: Record<string, string> = {
  like: "❤️",
  repost: "🔄",
  follow: "➕",
  mention: "💬",
  reply: "💬",
  quote: "🔁",
};

function getNotificationHref(
  notification: any
): string {
  if (notification.reason === "follow") {
    return `/profile/${notification.author?.handle}`;
  }

  const targetUri =
    notification.reason === "like" ||
    notification.reason === "repost"
      ? notification.reasonSubject
      : notification.uri;

  return `/post?uri=${encodeURIComponent(
    targetUri || ""
  )}`;
}

function formatNotificationDate(
  indexedAt?: string
): string {
  if (!indexedAt) return "";

  try {
    return new Date(indexedAt).toLocaleString(
      "fr-BE",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  } catch {
    return indexedAt;
  }
}

export default function NotificationsPage() {
  const { checked, handle } = useRequireAuth();

  const fetchNotificationsPage = useCallback(
    async (cursor?: string) => {
      if (!checked) {
        return {
          items: [],
          cursor: undefined,
        };
      }

      const response = await getNotifications(
        30,
        cursor
      );

      return {
        items: response.items,
        cursor: response.cursor,
      };
    },
    [checked]
  );

  const {
    items,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useInfiniteFeed(
    fetchNotificationsPage,
    [checked],
    {
      cacheKey: "notifications:me",
      staleTimeMs: 15_000,
      getItemKey: (notification: any) =>
        `${notification.uri}-${notification.indexedAt}`,
    }
  );

  useEffect(() => {
    if (!checked) return;

    markNotificationsSeen().catch((error) => {
      console.error(
        "Impossible de marquer les notifications comme lues :",
        error
      );
    });
  }, [checked]);

  useEffect(() => {
    if (!checked) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, NOTIFICATION_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [checked, refresh]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification de votre session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 border-x border-kelo-border bg-white pb-20 shadow-kelo">
        <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 backdrop-blur-md">
          <div className="px-4 py-4 sm:px-5 lg:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-extrabold text-kelo-text sm:text-2xl">
                  Notifications
                </h1>
                <p className="mt-1 text-xs text-kelo-muted sm:text-sm">
                  Retrouvez les nouvelles interactions avec votre compte.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {refreshing && items.length > 0 && (
                  <span className="text-xs text-kelo-muted">
                    Actualisation…
                  </span>
                )}
                {items.length > 0 && (
                  <span className="rounded-full bg-kelo-background px-3 py-1 text-xs font-semibold text-kelo-muted">
                    {items.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-kelo-border">
          {items.map((notification: any) => (
            <Link
              key={`${notification.uri}-${notification.indexedAt}`}
              href={getNotificationHref(notification)}
              className="group flex gap-3 px-4 py-4 transition-colors hover:bg-kelo-background/60 sm:px-5 lg:px-6"
            >
              <Avatar
                src={notification.author?.avatar}
                fallback={notification.author?.handle?.[0]?.toUpperCase() || "U"}
                size="sm"
              />

              <div className="min-w-0 flex-grow">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="max-w-full truncate text-sm font-bold text-kelo-text">
                    {notification.author?.displayName || notification.author?.handle || "Utilisateur"}
                  </span>
                  <AccountBadges
                    actor={notification.author}
                    identitySize="sm"
                    certificationSize={15}
                    gap="xs"
                  />
                  {notification.author?.handle && (
                    <span className="max-w-full truncate text-xs text-kelo-muted">
                      @{notification.author.handle}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-kelo-muted">
                  <span className="mr-1">
                    {REASON_ICONS[notification.reason] || "🔔"}
                  </span>
                  {REASON_LABELS[notification.reason] || notification.reason}
                </p>

                {notification.record?.text && (
                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-kelo-text">
                    {notification.record.text}
                  </p>
                )}

                <time className="mt-2 block text-xs text-kelo-muted">
                  {formatNotificationDate(notification.indexedAt)}
                </time>
              </div>

              {!notification.isRead && (
                <span
                  aria-label="Notification non lue"
                  className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-kelo-primary"
                />
              )}
            </Link>
          ))}

          {items.length === 0 && !loading && !error && (
            <div className="flex min-h-[calc(100vh-100px)] items-start justify-center px-6 py-12 sm:items-center">
              <div className="max-w-md text-center">
                <div className="text-4xl" aria-hidden="true">🔔</div>
                <h2 className="mt-4 text-lg font-bold text-kelo-text">
                  Aucune notification
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
                  Les mentions, réponses, abonnements, likes et reposts apparaîtront ici.
                </p>
              </div>
            </div>
          )}

          {error && items.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-kelo-danger">
              {error}
            </p>
          )}

          {loading && items.length === 0 && (
            <div className="flex justify-center py-10">
              <img
                src="https://kelosocial.sirv.com/logo.png"
                alt="Chargement"
                className="h-10 w-10 animate-spin object-contain"
              />
            </div>
          )}

          <InfiniteScrollSentinel
            onIntersect={loadMore}
            disabled={loadingMore || !hasMore}
          />
        </div>
      </main>
    </div>
  );
}
