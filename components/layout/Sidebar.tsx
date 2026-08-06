"use client";

import {
  useEffect,
} from "react";
import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  Home,
  Search,
  Bell,
  MessageCircle,
  Hash,
  ListChecks,
  Rocket,
  Bookmark,
  User,
  Settings,
  ShieldCheck,
  BadgeCheck,
  PenSquare,
  LogOut,
} from "lucide-react";

import Logo from "@/components/ui/Logo";
import {
  useAdminRole,
} from "@/hooks/useAdminRole";

interface SidebarProps {
  handle: string;
  onLogout: () => void;
}

const NAV_ITEMS = [
  {
    href: "/feed",
    label: "Accueil",
    icon: Home,
  },
  {
    href: "/search",
    label: "Explorer",
    icon: Search,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    href: "/messages",
    label: "Discussions",
    icon: MessageCircle,
  },
  {
    href: "/feeds",
    label: "Fils d'actu",
    icon: Hash,
  },
  {
    href: "/lists",
    label: "Listes",
    icon: ListChecks,
  },
  {
    href: "/starter-packs",
    label: "Kits de démarrage",
    icon: Rocket,
  },
  {
    href: "/bookmarks",
    label: "Conservés",
    icon: Bookmark,
  },
  {
    href: "/profile",
    label: "Profil",
    icon: User,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: Settings,
  },
];

function isRouteActive(
  pathname: string,
  href: string
): boolean {
  if (href === "/feed") {
    return pathname === "/feed";
  }

  if (href === "/profile") {
    return (
      pathname === "/profile" ||
      pathname.startsWith("/profile/")
    );
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

export default function Sidebar({
  handle,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    isAdmin,
    isTrustedVerifier,
  } = useAdminRole();

  useEffect(() => {
    const routes = NAV_ITEMS.map(
      (item) => item.href
    );

    if (isAdmin) {
      routes.push("/admin");
    } else if (isTrustedVerifier) {
      routes.push("/verifier");
    }

    const timeout = window.setTimeout(
      () => {
        routes.forEach((route) => {
          router.prefetch(route);
        });
      },
      250
    );

    return () =>
      window.clearTimeout(timeout);
  }, [
    isAdmin,
    isTrustedVerifier,
    router,
  ]);

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-shrink-0 flex-col justify-between border-r border-kelo-border bg-white p-6 md:flex">
      <div className="min-h-0 overflow-y-auto">
        <div className="mb-8 flex items-center gap-2 px-2">
          <Logo className="h-9 w-auto" />

          <span className="text-lg font-extrabold text-kelo-text">
            Kelo
          </span>
        </div>

        <nav className="flex flex-col gap-1 text-base font-semibold text-kelo-text">
          {NAV_ITEMS.map(
            ({
              href,
              label,
              icon: Icon,
            }) => {
              const active =
                isRouteActive(
                  pathname,
                  href
                );

              return (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  onMouseEnter={() =>
                    router.prefetch(href)
                  }
                  onFocus={() =>
                    router.prefetch(href)
                  }
                  className={`flex items-center gap-4 rounded-2xl p-3 transition-colors ${
                    active
                      ? "bg-kelo-gradient text-white"
                      : "hover:bg-kelo-background"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />

                  <span className="truncate">
                    {label}
                  </span>
                </Link>
              );
            }
          )}

          {isAdmin && (
            <Link
              href="/admin"
              prefetch
              onMouseEnter={() =>
                router.prefetch("/admin")
              }
              className={`flex items-center gap-4 rounded-2xl p-3 ${
                isRouteActive(
                  pathname,
                  "/admin"
                )
                  ? "bg-kelo-gradient text-white"
                  : "text-kelo-secondary hover:bg-kelo-background"
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
              Panneau Admin
            </Link>
          )}

          {!isAdmin &&
            isTrustedVerifier && (
              <Link
                href="/verifier"
                prefetch
                onMouseEnter={() =>
                  router.prefetch(
                    "/verifier"
                  )
                }
                className={`flex items-center gap-4 rounded-2xl p-3 ${
                  isRouteActive(
                    pathname,
                    "/verifier"
                  )
                    ? "bg-kelo-gradient text-white"
                    : "text-kelo-secondary hover:bg-kelo-background"
                }`}
              >
                <BadgeCheck className="h-5 w-5" />
                Panneau certificateur
              </Link>
            )}
        </nav>
      </div>

      <div className="border-t border-kelo-border pt-4">
        <Link
          href="/feed"
          prefetch
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-kelo-gradient py-3 font-bold text-white"
        >
          <PenSquare className="h-4 w-4" />
          Nouveau post
        </Link>

        <div className="mb-2 truncate px-1 text-xs text-kelo-muted">
          Connecté :{" "}
          <span className="font-bold text-kelo-text">
            @{handle || "invité"}
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-kelo-background py-2.5 text-sm font-bold text-kelo-text"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
