"use client";

import { useEffect, useState } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { getStoredSession } from "@/services/auth.service";

interface MobileNavigationShellProps {
  children: React.ReactNode;
}

const HIDDEN_ROUTES = [
  "/login",
  "/signup",
  "/register",
];

export default function MobileNavigationShell({
  children,
}: MobileNavigationShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [handle, setHandle] = useState("");

  const navigationHidden = useHideOnScroll({
    threshold: 10,
    minimumScroll: 100,
  });

  useEffect(() => {
    const session = getStoredSession();

    setHandle(session?.handle || "");
  }, [pathname]);

  const shouldHideNavigation =
    HIDDEN_ROUTES.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

  const handleCreatePost = () => {
    router.push("/feed?compose=true");
  };

  return (
    <>
      <div
        className={
          shouldHideNavigation
            ? ""
            : "pb-24 md:pb-0"
        }
      >
        {children}
      </div>

      {!shouldHideNavigation && (
        <MobileBottomNav
          handle={handle}
          hidden={navigationHidden}
          onCreatePost={handleCreatePost}
        />
      )}
    </>
  );
}
