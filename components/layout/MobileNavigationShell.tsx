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

const PRIMARY_APP_ROUTES = [
  "/feed",
  "/search",
  "/messages",
  "/notifications",
  "/bookmarks",
  "/feeds",
  "/lists",
  "/starter-packs",
  "/settings",
];

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

    // Précharge le code des destinations principales une fois la session
    // disponible. Les clics de navigation deviennent alors de simples
    // transitions client au lieu d'attendre le chargement du prochain écran.
    const routes = handle
      ? [...PRIMARY_APP_ROUTES, `/profile/${handle}`]
      : PRIMARY_APP_ROUTES;

    const timeoutId = globalThis.setTimeout(() => {
      routes.forEach((route) => {
        if (!matchesRoute(pathname, route)) {
          router.prefetch(route);
        }
      });
    }, 200);

    return () => globalThis.clearTimeout(timeoutId);
  }, [checked, session, handle, pathname, router]);

  const isConversation = pathname.startsWith("/messages/");
  const isPublicRoute = PUBLIC_ROUTES.some((route) => matchesRoute(pathname, route));
  const shouldShowNavigation = checked && !!session && !isPublicRoute && !isConversation;

  const handleCreatePost = () => {
    setMenuOpen(false);
    window.dispatchEvent(new Event(OPEN_GLOBAL_COMPOSER_EVENT));
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
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

      {checked && session && !isPublicRoute && <GlobalPostComposer />}

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
