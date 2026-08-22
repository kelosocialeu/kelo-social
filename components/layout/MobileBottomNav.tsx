"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Home, MessageCircle, Plus, User } from "lucide-react";
import { useTranslation } from "@/components/providers/TranslationProvider";

interface MobileBottomNavProps {
  handle?: string;
  hidden?: boolean;
  onCreatePost?: () => void;
}

export default function MobileBottomNav({ handle, hidden = false, onCreatePost }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: "/feed", label: t("nav.home", "Accueil"), icon: Home },
    { href: "/reels", label: t("nav.reels", "Réels"), icon: Clapperboard },
    { href: "/messages", label: t("nav.messages", "Discussions"), icon: MessageCircle },
  ];

  const profileHref = handle ? `/profile/${handle}` : "/profile";
  const isActive = (href: string) => {
    if (href === "/feed") return pathname === "/feed";
    if (href === "/messages") return pathname.startsWith("/messages");
    if (href === "/reels") return pathname.startsWith("/reels");
    return pathname === href;
  };
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <nav aria-label={t("nav.mobile", "Navigation mobile")} className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-all duration-300 ease-out md:hidden ${hidden ? "translate-y-[140%] opacity-0" : "translate-y-0 opacity-100"}`}>
      <div className="relative flex h-[68px] w-full max-w-md items-center justify-between rounded-[28px] border border-white/30 bg-white/65 px-3 shadow-[0_18px_55px_rgba(67,24,130,0.28)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]"><div className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-fuchsia-400/20 blur-2xl"/><div className="absolute -right-8 -bottom-10 h-28 w-28 rounded-full bg-sky-400/20 blur-2xl"/><div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"/></div>

        <MobileNavLink {...navItems[0]} active={isActive(navItems[0].href)} />
        <MobileNavLink {...navItems[1]} active={isActive(navItems[1].href)} />

        <button type="button" onClick={onCreatePost} aria-label={t("nav.createPost", "Créer une publication")} className="relative z-10 -mt-8 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-kelo-gradient text-white shadow-[0_12px_32px_rgba(139,92,246,0.45)] transition-all duration-200 hover:scale-105 active:scale-95"><span className="absolute inset-0 rounded-full border border-white/35"/><Plus className="relative h-7 w-7" strokeWidth={2.4}/></button>

        <MobileNavLink {...navItems[2]} active={isActive(navItems[2].href)} />
        <MobileNavLink href={profileHref} label={t("nav.profile", "Profil")} icon={User} active={profileActive}/>
      </div>
    </nav>
  );
}

interface MobileNavLinkProps { href: string; label: string; icon: typeof Home; active: boolean; }

function MobileNavLink({ href, label, icon: Icon, active }: MobileNavLinkProps) {
  return <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-200 active:scale-90">
    {active && <span className="absolute inset-1 rounded-2xl bg-kelo-gradient shadow-[0_7px_18px_rgba(139,92,246,0.28)]"/>}
    <Icon className={`relative h-[22px] w-[22px] transition-colors ${active ? "text-white" : "text-kelo-muted"}`} strokeWidth={active ? 2.4 : 2}/>
    {active && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-white"/>}
  </Link>;
}
