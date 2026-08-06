"use client";

import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import MobileBottomNav from "@/components/layout/MobileBottomNav";
import MobileDrawer from "@/components/layout/MobileDrawer";
import MobileHeader from "@/components/layout/MobileHeader";

import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { getStoredSession } from "@/services/auth.service";

interface MobileNavigationShellProps {
  children: React.ReactNode;
}

const HIDDEN_ROUTES = [
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
];

export default function MobileNavigationShell({
  children,
}: MobileNavigationShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [handle, setHandle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigationHidden = useHideOnScroll({
    minimumScroll: 80,
    revealDelay: 300,
    movementThreshold: 3,
  });

  useEffect(() => {
    const session = getStoredSession();
    setHandle(session?.handle || "");
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

  const shouldHideNavigation =
    isConversation ||
    HIDDEN_ROUTES.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

  const handleCreatePost = () => {
    router.push("/feed?compose=true");
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <>
      <div
        className={
          shouldHideNavigation
            ? ""
            : "pb-24 pt-[calc(56px+env(safe-area-inset-top))] md:pb-0 md:pt-0"
        }
      >
        {children}
      </div>

      {!shouldHideNavigation && (
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
