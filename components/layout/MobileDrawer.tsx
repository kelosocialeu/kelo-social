"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgeCheck, Bell, Bookmark, Bot, Clapperboard, Hash, Home, ListChecks, LogOut, MessageCircle, PenSquare, Rocket, Search, Settings, ShieldCheck, User, X } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useTranslation } from "@/components/providers/TranslationProvider";

interface MobileDrawerProps { open: boolean; handle: string; onClose: () => void; onLogout: () => void; onCreatePost: () => void; }

const NAV_ITEMS = [
  { href: "/feed", key: "nav.home", fallback: "Accueil", icon: Home },
  { href: "/reels", key: "nav.reels", fallback: "Réels", icon: Clapperboard },
  { href: "/search", key: "nav.explore", fallback: "Explorer", icon: Search },
  { href: "/notifications", key: "nav.notifications", fallback: "Notifications", icon: Bell },
  { href: "/messages", key: "nav.messages", fallback: "Discussions", icon: MessageCircle },
  { href: "/feeds", key: "nav.feeds", fallback: "Fils d'actu", icon: Hash },
  { href: "/lists", key: "nav.lists", fallback: "Listes", icon: ListChecks },
  { href: "/starter-packs", key: "nav.starterPacks", fallback: "Kits de démarrage", icon: Rocket },
  { href: "/bookmarks", key: "nav.bookmarks", fallback: "Conservés", icon: Bookmark },
  { href: "/profile", key: "nav.profile", fallback: "Profil", icon: User },
  { href: "/settings", key: "nav.settings", fallback: "Paramètres", icon: Settings },
];

function isRouteActive(pathname: string, href: string) {
  if (href === "/feed") return pathname === "/feed";
  if (href === "/profile") return pathname === "/profile" || pathname.startsWith("/profile/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileDrawer({ open, handle, onClose, onLogout, onCreatePost }: MobileDrawerProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { checked, isAdmin, isTrustedVerifier, canCertify } = useAdminRole();
  const showVerifier = checked && !isAdmin && (isTrustedVerifier || canCertify);

  return <>
    <div aria-hidden={!open} onClick={onClose} className={`fixed inset-0 z-[60] bg-slate-950/35 backdrop-blur-sm transition-opacity duration-300 md:hidden ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`} />
    <aside role="dialog" aria-modal="true" aria-label={t("nav.mainMenu", "Menu principal")} className={`fixed bottom-0 left-0 top-0 z-[70] flex w-[88%] max-w-sm flex-col overflow-hidden border-r border-white/30 bg-white/80 shadow-[24px_0_70px_rgba(35,20,70,0.28)] backdrop-blur-3xl transition-transform duration-300 ease-out md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" /><div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-sky-400/20 blur-3xl" /></div>
      <div className="relative flex items-center justify-between border-b border-white/40 px-5 pb-4 pt-[max(20px,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient shadow-md"><Logo className="h-7 w-7" /></div><div className="min-w-0"><p className="font-extrabold text-kelo-text">Kelo Social</p><p className="max-w-[190px] truncate text-xs text-kelo-muted">@{handle || t("nav.guest", "invité")}</p></div></div>
        <button type="button" onClick={onClose} aria-label={t("nav.closeMenu", "Fermer le menu")} className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/60 text-kelo-muted transition active:scale-95"><X className="h-5 w-5" /></button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <button type="button" onClick={() => { onCreatePost(); onClose(); }} className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-kelo-gradient py-3 font-bold text-white shadow-[0_12px_30px_rgba(139,92,246,0.3)] transition active:scale-[0.98]"><PenSquare className="h-4 w-4" />{t("nav.writePost", "Nouveau post")}</button>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, key, fallback, icon: Icon }) => { const active = isRouteActive(pathname, href); return <Link key={href} href={href} onClick={onClose} aria-current={active ? "page" : undefined} className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-kelo-gradient text-white shadow-sm" : "text-kelo-text hover:bg-white/60"}`}><Icon className="h-5 w-5 flex-shrink-0" /><span className="truncate">{t(key, fallback)}</span></Link>; })}
          {showVerifier && <Link href="/verifier" onClick={onClose} aria-current={isRouteActive(pathname, "/verifier") ? "page" : undefined} className={`flex items-center gap-4 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isRouteActive(pathname, "/verifier") ? "bg-kelo-gradient text-white shadow-sm" : "text-kelo-secondary hover:bg-white/60"}`}><BadgeCheck className="h-5 w-5" />{t("nav.verifier", "Panneau certificateur")}</Link>}
          {checked && isAdmin && <div className="mt-3 rounded-2xl border border-kelo-primary/20 bg-white/55 p-2">
            <p className="px-3 pb-1 pt-2 text-[11px] font-extrabold uppercase tracking-wider text-kelo-muted">{t("nav.administration", "Administration")}</p>
            <Link href="/admin" onClick={onClose} className={`flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-semibold transition ${pathname === "/admin" ? "bg-kelo-gradient text-white shadow-sm" : "text-kelo-secondary hover:bg-white/70"}`}><ShieldCheck className="h-5 w-5" />{t("nav.admin", "Tableau de bord")}</Link>
            <Link href="/admin/certifiers" onClick={onClose} className={`flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-semibold transition ${isRouteActive(pathname, "/admin/certifiers") ? "bg-kelo-gradient text-white shadow-sm" : "text-kelo-secondary hover:bg-white/70"}`}><BadgeCheck className="h-5 w-5" />{t("nav.certifications", "Certifications")}</Link>
            <Link href="/admin/certifiers" onClick={onClose} className="flex items-center gap-4 rounded-xl px-3 py-3 text-sm font-semibold text-kelo-secondary transition hover:bg-white/70"><Bot className="h-5 w-5" />{t("nav.robotAccounts", "Comptes robots")}</Link>
          </div>}
        </nav>
      </div>
      <div className="relative border-t border-white/40 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-4"><button type="button" onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/65 py-3 text-sm font-bold text-kelo-text transition active:scale-[0.98]"><LogOut className="h-4 w-4" />{t("nav.logout", "Déconnexion")}</button></div>
    </aside>
  </>;
}
