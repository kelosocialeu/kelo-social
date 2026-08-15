"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Menu } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { getUnreadNotificationCount } from "@/lib/atproto/notifications";

interface MobileHeaderProps {
  onOpenMenu: () => void;
}

const NOTIFICATION_COUNT_REFRESH_MS = 20_000;

export default function MobileHeader({
  onOpenMenu,
}: MobileHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      // Le header reste utilisable même si le service de notifications est temporairement indisponible.
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount();
      }
    }, NOTIFICATION_COUNT_REFRESH_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount();
      }
    };

    window.addEventListener("focus", refreshUnreadCount);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshUnreadCount);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshUnreadCount]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/30 bg-white/70 px-4 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-2xl md:hidden">
      <div className="relative flex h-14 items-center justify-center">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Ouvrir le menu"
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/55 text-kelo-text shadow-sm transition active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
          <span className="text-base font-extrabold text-kelo-text">
            Kelo
          </span>
        </div>

        <Link
          href="/notifications"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Notifications"
          }
          className="absolute right-0 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/55 text-kelo-text shadow-sm transition active:scale-95"
        >
          <Bell className="h-5 w-5" />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white shadow-sm ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
