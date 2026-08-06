"use client";

import { useEffect, useState } from "react";
import {
  usePathname,
} from "next/navigation";

import MobileBottomNav from "@/components/layout/MobileBottomNav";
import MobileDrawer from "@/components/layout/MobileDrawer";
import MobileHeader from "@/components/layout/MobileHeader";
import GlobalPostComposer, {
  OPEN_GLOBAL_COMPOSER_EVENT,
} from "@/components/feed/GlobalPostComposer";
import { useAuthContext } from "@/components/providers/AuthProvider";

import { useHideOnScroll } from "@/hooks/useHideOnScroll";

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

function matchesRoute(
  pathname: string,
  route: string
): boolean {
  if (route === "/") {
    return pathname === "/";
  }

  return (
    pathname === route ||
    pathname.startsWith(`${route}/`)
  );
}

export default function MobileNavigationShell({
  children,
}: MobileNavigationShellProps) {
  const pathname = usePathname();
  const { session, checked, handle, logout } =
    useAuthContext();

  const [menuOpen, setMenuOpen] = useState(false);

  const navigationHidden = useHideOnScroll({
    minimumScroll: 80,
    revealDelay: 300,
    movementThreshold: 3,
  });

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isConversation =
    pathname.startsWith("/messages/");

  const isPublicRoute =
    PUBLIC_ROUTES.some((route) =>
      matchesRoute(pathname, route)
    );

  const shouldShowNavigation =
    checked &&
    !!session &&
    !isPublicRoute &&
    !isConversation;

  const handleCreatePost = () => {
    setMenuOpen(false);
    window.dispatchEvent(
      new Event(OPEN_GLOBAL_COMPOSER_EVENT)
    );
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

      {checked && session && !isPublicRoute && (
        <GlobalPostComposer />
      )}

      {shouldShowNavigation && (
        <>
          <MobileHeader
            onOpenMenu={() => setMenuOpen(true)}
          />

          <MobileDrawer
            open={menuOpen}
            handle={handle}
            onClose={() => setMenuOpen(false)}
            onLogout={handleLogout}
            onCreatePost={handleCreatePost}
          />

          <MobileBottomNav
            handle={handle}
            hidden={navigationHidden || menuOpen}
            onCreatePost={handleCreatePost}
          />
        </>
      )}
    </>
  );
}
