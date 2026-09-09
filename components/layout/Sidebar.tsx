"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Search, Bell, MessageCircle, Hash, ListChecks, Rocket, Bookmark,
  User, Settings, ShieldCheck, BadgeCheck, PenSquare, LogOut, Newspaper, Clapperboard, Gamepad2,
} from "lucide-react";

import AccountSwitcher from "@/components/layout/AccountSwitcher";
import Logo from "@/components/ui/Logo";
import { OPEN_GLOBAL_COMPOSER_EVENT } from "@/components/feed/GlobalPostComposer";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useTranslation } from "@/components/providers/TranslationProvider";

interface SidebarProps { handle: string; onLogout: () => void; }

const NAV_ITEMS = [
  { href: "/feed", key: "nav.home", fallback: "Accueil", icon: Home },
  { href: "/reels", key: "nav.reels", fallback: "Réels", icon: Clapperboard },
  { href: "/games", key: "nav.games", fallback: "Jeux", icon: Gamepad2 },
  { href: "/search", key: "nav.explore", fallback: "Explorer", icon: Search },
  { href: "/journal", key: "nav.journal", fallback: "Journal", icon: Newspaper },
  { href: "/notifications", key: "nav.notifications", fallback: "Notifications", icon: Bell },
  { href: "/messages", key: "nav.messages", fallback: "Discussions", icon: MessageCircle },
  { href: "/feeds", key: "nav.feeds", fallback: "Fils d'actu", icon: Hash },
  { href: "/lists", key: "nav.lists", fallback: "Listes", icon: ListChecks },
  { href: "/starter-packs", key: "nav.starterPacks", fallback: "Kits de démarrage", icon: Rocket },
  { href: "/bookmarks", key: "nav.bookmarks", fallback: "Conservés", icon: Bookmark },
  { href: "/profile", key: "nav.profile", fallback: "Profil", icon: User },
  { href: "/settings", key: "nav.settings", fallback: "Paramètres", icon: Settings },
];

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/feed") return pathname === "/feed";
  if (href === "/games") return pathname === "/games" || pathname.startsWith("/games/");
  if (href === "/profile") return pathname === "/profile" || pathname.startsWith("/profile/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ handle, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const { isAdmin, isTrustedVerifier, canCertify } = useAdminRole();
  const { count: unreadNotifications } = useUnreadNotifications();
  const { t } = useTranslation();
  const openComposer = () => window.dispatchEvent(new Event(OPEN_GLOBAL_COMPOSER_EVENT));

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const markNavigationPending = (href: string) => {
    if (!isRouteActive(pathname, href)) setPendingHref(href);
  };

  const sidebarContent = (
    <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-72 flex-col justify-between border-r border-kelo-border bg-white p-6 md:flex">
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="mb-8 flex items-center gap-2 px-2"><Logo className="h-9 w-auto"/><span className="text-lg font-extrabold text-kelo-text">Kelo</span></div>
        <nav className="flex flex-col gap-1 text-base font-semibold text-kelo-text">
          {NAV_ITEMS.map(({ href, key, fallback, icon: Icon }) => {
            const active = isRouteActive(pathname, href);
            const pending = pendingHref === href;
            return <Link key={href} href={href} prefetch onClick={() => markNavigationPending(href)} aria-current={active ? "page" : undefined} aria-busy={pending || undefined} className={`flex touch-manipulation items-center gap-4 rounded-2xl p-3 transition-colors ${active ? "bg-kelo-gradient text-white" : "hover:bg-kelo-background"} ${pending ? "opacity-70" : ""}`}>
              <Icon className="h-5 w-5 flex-shrink-0"/><span className="min-w-0 flex-1 truncate">{t(key, fallback)}</span>
              {href === "/notifications" && unreadNotifications > 0 && <span aria-label={t("nav.unreadNotifications", `${unreadNotifications} notification(s) non lue(s)`, { count: unreadNotifications })} className={`flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-extrabold ${active ? "bg-white text-kelo-primary" : "bg-kelo-gradient text-white"}`}>{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}
            </Link>;
          })}

          {isAdmin && <>
            <Link href="/admin" prefetch onClick={() => markNavigationPending("/admin")} className={`flex touch-manipulation items-center gap-4 rounded-2xl p-3 ${pathname === "/admin" ? "bg-kelo-gradient text-white" : "text-kelo-secondary hover:bg-kelo-background"}`}><ShieldCheck className="h-5 w-5"/>{t("nav.admin", "Panneau Admin")}</Link>
            <Link href="/admin/journal" prefetch onClick={() => markNavigationPending("/admin/journal")} className={`flex touch-manipulation items-center gap-4 rounded-2xl p-3 ${isRouteActive(pathname, "/admin/journal") ? "bg-kelo-gradient text-white" : "text-kelo-secondary hover:bg-kelo-background"}`}><Newspaper className="h-5 w-5"/>{t("nav.journalMedia", "Médias du Journal")}</Link>
            <Link href="/admin/certifiers" prefetch onClick={() => markNavigationPending("/admin/certifiers")} className={`flex touch-manipulation items-center gap-4 rounded-2xl p-3 ${isRouteActive(pathname, "/admin/certifiers") ? "bg-kelo-gradient text-white" : "text-kelo-secondary hover:bg-kelo-background"}`}><BadgeCheck className="h-5 w-5"/>{t("nav.certifiers", "Gérer les certificateurs")}</Link>
          </>}

          {!isAdmin && (isTrustedVerifier || canCertify) && <Link href="/verifier" prefetch onClick={() => markNavigationPending("/verifier")} className={`flex touch-manipulation items-center gap-4 rounded-2xl p-3 ${isRouteActive(pathname, "/verifier") ? "bg-kelo-gradient text-white" : "text-kelo-secondary hover:bg-kelo-background"}`}><BadgeCheck className="h-5 w-5"/>{t("nav.verifier", "Panneau certificateur")}</Link>}
        </nav>
      </div>

      <div className="border-t border-kelo-border pt-4">
        <button type="button" onClick={openComposer} className="mb-4 flex w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-kelo-gradient py-3 font-bold text-white"><PenSquare className="h-4 w-4"/>{t("nav.writePost", "Écrire un post")}</button>
        <div className="mb-3"><AccountSwitcher compact /></div>
        <button type="button" onClick={onLogout} className="flex w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-kelo-background py-2.5 text-sm font-bold text-kelo-text"><LogOut className="h-4 w-4"/>{t("nav.logout", "Déconnexion")}</button>
      </div>
    </aside>
  );

  return <><div aria-hidden="true" className="hidden w-72 flex-shrink-0 md:block"/>{sidebarContent}</>;
}
