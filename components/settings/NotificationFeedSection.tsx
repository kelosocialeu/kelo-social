"use client";

import { useEffect, useState } from "react";
import { Bell, ListFilter } from "lucide-react";

import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  FeedViewPreferences,
  getFeedViewPreferences,
  setFeedViewPreferences,
} from "@/lib/atproto/preferences";
import {
  DEFAULT_KELO_NOTIFICATION_PREFERENCES,
  KeloNotificationPreferences,
  getKeloNotificationPreferences,
  saveKeloNotificationPreferences,
} from "@/lib/kelo-notification-preferences";

const NOTIFICATION_ITEMS: Array<{
  key: keyof KeloNotificationPreferences;
  label: string;
  description: string;
}> = [
  { key: "reply", label: "Réponses", description: "Afficher les réponses à vos publications." },
  { key: "mention", label: "Mentions", description: "Afficher les publications qui vous mentionnent." },
  { key: "follow", label: "Nouveaux abonnés", description: "Afficher les nouveaux abonnements à votre compte." },
  { key: "like", label: "J'aime", description: "Afficher les mentions J'aime reçues." },
  { key: "repost", label: "Reposts", description: "Afficher les republications de vos posts." },
  { key: "quote", label: "Citations", description: "Afficher les publications qui citent vos posts." },
];

const DEFAULT_FEED: FeedViewPreferences = {
  hideReplies: false,
  hideReposts: false,
  hideQuotePosts: false,
};

export default function NotificationFeedSection() {
  const { did } = useAuthContext();
  const [notifications, setNotifications] = useState<KeloNotificationPreferences>(
    DEFAULT_KELO_NOTIFICATION_PREFERENCES
  );
  const [feed, setFeed] = useState<FeedViewPreferences>(DEFAULT_FEED);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedMessage, setFeedMessage] = useState("");

  useEffect(() => {
    setNotifications(getKeloNotificationPreferences(did));
  }, [did]);

  useEffect(() => {
    let cancelled = false;

    getFeedViewPreferences()
      .then((prefs) => {
        if (!cancelled) setFeed(prefs);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setFeedMessage("Impossible de charger les préférences AT Protocol.");
      })
      .finally(() => {
        if (!cancelled) setLoadingFeed(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateNotification = (key: keyof KeloNotificationPreferences, enabled: boolean) => {
    const next = { ...notifications, [key]: enabled };
    setNotifications(next);
    saveKeloNotificationPreferences(did, next);
  };

  const updateFeed = async (key: keyof FeedViewPreferences, enabled: boolean) => {
    const previous = feed;
    const next = { ...feed, [key]: enabled };
    setFeed(next);
    setFeedMessage("Enregistrement…");

    try {
      await setFeedViewPreferences(next);
      setFeedMessage("Enregistré dans vos préférences AT Protocol.");
    } catch (error) {
      console.error(error);
      setFeed(previous);
      setFeedMessage("Impossible d'enregistrer ce réglage AT Protocol.");
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      <section>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-kelo-primary" />
          <h3 className="text-base font-extrabold text-kelo-text">Notifications dans Kelo Social</h3>
        </div>
        <p className="mt-1 text-sm leading-6 text-kelo-muted">
          Choisissez les interactions à afficher dans votre page Notifications. Ces choix sont propres à Kelo Social et enregistrés séparément pour votre compte sur cet appareil.
        </p>

        <div className="mt-4 divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border">
          {NOTIFICATION_ITEMS.map((item) => (
            <label key={item.key} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-kelo-text">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-kelo-muted">{item.description}</p>
              </div>
              <input
                type="checkbox"
                checked={notifications[item.key]}
                onChange={(event) => updateNotification(item.key, event.target.checked)}
                className="h-5 w-5 shrink-0 accent-kelo-primary"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="border-t border-kelo-border pt-6">
        <div className="flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-kelo-primary" />
          <h3 className="text-base font-extrabold text-kelo-text">Contenu du fil</h3>
        </div>
        <p className="mt-1 text-sm leading-6 text-kelo-muted">
          Ces options correspondent aux préférences de fil AT Protocol et sont enregistrées avec votre compte, pas seulement sur cet appareil.
        </p>

        <div className="mt-4 divide-y divide-kelo-border overflow-hidden rounded-2xl border border-kelo-border">
          <label className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-bold text-kelo-text">Masquer les réponses dans le fil</p>
              <p className="mt-1 text-xs text-kelo-muted">Réduit les réponses affichées dans votre fil principal.</p>
            </div>
            <input type="checkbox" disabled={loadingFeed} checked={feed.hideReplies} onChange={(e) => updateFeed("hideReplies", e.target.checked)} className="h-5 w-5 shrink-0 accent-kelo-primary" />
          </label>

          <label className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-bold text-kelo-text">Masquer les reposts</p>
              <p className="mt-1 text-xs text-kelo-muted">N'affiche pas les republications dans le fil principal.</p>
            </div>
            <input type="checkbox" disabled={loadingFeed} checked={feed.hideReposts} onChange={(e) => updateFeed("hideReposts", e.target.checked)} className="h-5 w-5 shrink-0 accent-kelo-primary" />
          </label>

          <label className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-bold text-kelo-text">Masquer les citations</p>
              <p className="mt-1 text-xs text-kelo-muted">N'affiche pas les posts de citation dans le fil principal.</p>
            </div>
            <input type="checkbox" disabled={loadingFeed} checked={feed.hideQuotePosts} onChange={(e) => updateFeed("hideQuotePosts", e.target.checked)} className="h-5 w-5 shrink-0 accent-kelo-primary" />
          </label>
        </div>

        {feedMessage && <p className="mt-3 text-xs text-kelo-muted">{feedMessage}</p>}
      </section>
    </div>
  );
}
