"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import MobileBottomNav from "@/components/layout/MobileBottomNav";
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

  useEffect(() => {
    const session = getStoredSession();

    if (session?.handle) {
      setHandle(session.handle);
    }
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
          onCreatePost={handleCreatePost}
        />
      )}
    </>
  );
}
