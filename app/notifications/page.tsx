"use client";

import { useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Avatar from "@/components/feed/Avatar";
import InfiniteScrollSentinel from "@/components/feed/InfiniteScrollSentinel";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import { getNotifications, markNotificationsSeen } from "@/lib/atproto/notifications";

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

function getNotificationHref(notif: any): string {
  if (notif.reason === "follow") {
    return `/profile/${notif.author?.handle}`;
  }
  const targetUri = notif.reason === "like" || notif.reason === "repost" ? notif.reasonSubject : notif.uri;
  return `/post?uri=${encodeURIComponent(targetUri || "")}`;
}

export default function NotificationsPage() {
  const { checked, handle } = useRequireAuth();

  const fetcher = async (cursor?: string) => {
    if (!checked) return { items: [], cursor: undefined };
    const res = await getNotifications(30, cursor);
    return { items: res.items, cursor: res.cursor };
  };

  const { items, loading, hasMore, error, loadMore } = useInfiniteFeed(fetcher, [checked]);

  useEffect(() => {
    if (checked) markNotificationsSeen().catch(() => {});
  }, [checked]);

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

        <main className="min-h-screen max-w-2xl flex-grow border-r border-kelo-border bg-white pb-20 shadow-kelo">
          <div className="sticky top-0 z-10 border-b border-kelo-border bg-white/90 p-4 backdrop-blur-md">
            <h2 className="text-xl font-extrabold text-kelo-text">Notifications</h2>
          </div>

          <div className="divide-y divide-kelo-border">
            {items.map((notif: any) => (
              <Link
                key={notif.uri + notif.indexedAt}
                href={getNotificationHref(notif)}
                className="flex gap-3 p-4 transition-colors hover:bg-kelo-background/60"
              >
                <Avatar
                  src={notif.author?.avatar}
                  fallback={notif.author?.handle ? notif.author.handle[0].toUpperCase() : "U"}
                  size="sm"
                />
                <div className="flex-grow">
                  <p className="text-sm text-kelo-text">
                    <span className="font-bold">{notif.author?.displayName || notif.author?.handle}</span>{" "}
                    <span className="text-kelo-muted">
                      {REASON_ICONS[notif.reason] || "🔔"} {REASON_LABELS[notif.reason] || notif.reason}
                    </span>
                  </p>
                  {notif.record?.text && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-kelo-muted">{notif.record.text}</p>
                  )}
                  <span className="mt-1 block text-xs text-kelo-muted">
                    {new Date(notif.indexedAt).toLocaleString()}
                  </span>
                </div>
                {!notif.isRead && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-kelo-primary" />}
              </Link>
            ))}

            {items.length === 0 && !loading && (
              <p className="py-10 text-center text-sm text-kelo-muted">Aucune notification pour l'instant.</p>
            )}

            {error && <p className="py-6 text-center text-sm text-kelo-danger">{error}</p>}
            {loading && <p className="py-6 text-center text-sm text-kelo-muted">Chargement...</p>}

            <InfiniteScrollSentinel onIntersect={loadMore} disabled={loading || !hasMore} />
          </div>
        </main>
    </div>
  );
}
