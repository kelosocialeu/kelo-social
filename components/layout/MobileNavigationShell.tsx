"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import MobileBottomNav from "@/components/layout/MobileBottomNav";
import MobileDrawer from "@/components/layout/MobileDrawer";
import MobileHeader from "@/components/layout/MobileHeader";
import GlobalPostComposer, { OPEN_GLOBAL_COMPOSER_EVENT } from "@/components/feed/GlobalPostComposer";
import { useAuthContext } from "@/components/providers/AuthProvider";

interface MobileNavigationShellProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/kelo-id/callback",
];

// On ne précharge que les destinations les plus utilisées. L'ancienne version
// préchargeait presque toute l'application après chaque changement de page,
// ce qui pouvait provoquer des pics réseau/CPU et rendre la navigation moins fluide.
const HIGH_PRIORITY_ROUTES = ["/feed", "/reels", "/messages"];

function matchesRoute(pathname: string, route: string): boolean {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function MobileNavigationShell({ children }: MobileNavigationShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, checked, handle, logout } = useAuthContext();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!checked || !session) return;

    let cancelled = false;

    const prefetchCoreRoutes = () => {
      if (cancelled) return;
      HIGH_PRIORITY_ROUTES.forEach((route) => router.prefetch(route));
      if (handle) router.prefetch(`/profile/${handle}`);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | null = null;
    let timeoutId: number | null = null;

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(prefetchCoreRoutes, { timeout: 1800 });
    } else {
      timeoutId = window.setTimeout(prefetchCoreRoutes, 900);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [checked, session, handle, router]);

  const isConversation = pathname.startsWith("/messages/");
  const isReels = pathname === "/reels" || pathname.startsWith("/reels/");
  const isPublicRoute = PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));
  const shouldShowNavigation = checked && !!session && !isPublicRoute && !isConversation && !isReels;

  const handleCreatePost = () => {
    setMenuOpen(false);
    window.dispatchEvent(new Event(OPEN_GLOBAL_COMPOSER_EVENT));
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <>
      <div
        className={
          shouldShowNavigation
            ? "min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(56px+env(safe-area-inset-top))] md:pb-0 md:pt-0"
            : "min-h-[100dvh]"
        }
      >
        {children}
      </div>

      {checked && session && !isPublicRoute && !isReels && <GlobalPostComposer />}

      {shouldShowNavigation && (
        <>
          <MobileHeader onOpenMenu={() => setMenuOpen(true)} />
          <MobileDrawer
            open={menuOpen}
            handle={handle}
            onClose={() => setMenuOpen(false)}
            onLogout={handleLogout}
            onCreatePost={handleCreatePost}
          />
          <MobileBottomNav
            handle={handle}
            hidden={menuOpen}
            onCreatePost={handleCreatePost}
          />
        </>
      )}
    </>
  );
}
