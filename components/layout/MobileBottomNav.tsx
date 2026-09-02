"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Gamepad2, Home, MessageCircle, Plus, User, X, Video, FileText } from "lucide-react";
import { useTranslation } from "@/components/providers/TranslationProvider";
import { OPEN_GLOBAL_COMPOSER_EVENT } from "@/components/feed/GlobalPostComposer";

interface MobileBottomNavProps {
  handle?: string;
  hidden?: boolean;
  onCreatePost?: () => void;
}

export default function MobileBottomNav({ handle, hidden = false, onCreatePost }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const reelCaptureRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { href: "/feed", label: t("nav.home", "Accueil"), icon: Home },
    { href: "/reels", label: t("nav.reels", "Réels"), icon: Clapperboard },
    { href: "/games", label: t("nav.games", "Jeux"), icon: Gamepad2 },
    { href: "/messages", label: t("nav.messages", "Discussions"), icon: MessageCircle },
  ];

  const profileHref = handle ? `/profile/${handle}` : "/profile";
  const isActive = (href: string) => {
    if (href === "/feed") return pathname === "/feed";
    if (href === "/messages") return pathname.startsWith("/messages");
    if (href === "/reels") return pathname.startsWith("/reels");
    if (href === "/games") return pathname.startsWith("/games");
    return pathname === href;
  };
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  const startPost = () => {
    setCreateMenuOpen(false);
    onCreatePost?.();
  };

  const startReel = () => {
    setCreateMenuOpen(false);
    reelCaptureRef.current?.click();
  };

  const handleReelCaptured = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    window.dispatchEvent(
      new CustomEvent(OPEN_GLOBAL_COMPOSER_EVENT, {
        detail: { mode: "reel", file },
      })
    );
  };

  return (
    <>
      <input ref={reelCaptureRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleReelCaptured} />

      {createMenuOpen && (
        <>
          <button
            type="button"
            aria-label={t("common.close", "Fermer le menu de création")}
            className="fixed inset-0 z-[58] bg-black/25 backdrop-blur-[2px] md:hidden"
            onClick={() => setCreateMenuOpen(false)}
          />
          <div className="fixed inset-x-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-3xl border border-white/50 bg-white/95 p-3 shadow-2xl backdrop-blur-2xl md:hidden">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <p className="text-sm font-extrabold text-kelo-text">{t("nav.createPost", "Créer")}</p>
              <button type="button" onClick={() => setCreateMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-kelo-background text-kelo-muted" aria-label={t("common.close", "Fermer")}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <button type="button" onClick={startPost} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:scale-[0.98] hover:bg-kelo-background">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-kelo-gradient text-white shadow-md"><FileText className="h-5 w-5" /></span>
              <span>
                <span className="block font-extrabold text-kelo-text">{t("nav.createPost", "Publication")}</span>
                <span className="block text-xs text-kelo-muted">{t("composer.placeholder", "Texte, photo, GIF ou vidéo")}</span>
              </span>
            </button>

            <button type="button" onClick={startReel} className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition active:scale-[0.98] hover:bg-kelo-background">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white shadow-md"><Video className="h-5 w-5" /></span>
              <span>
                <span className="block font-extrabold text-kelo-text">{t("nav.reels", "Réaliser un Réel")}</span>
                <span className="block text-xs text-kelo-muted">{t("nav.reelsDescription", "Ouvrir la caméra, filmer puis publier")}</span>
              </span>
            </button>
          </div>
        </>
      )}

      <nav aria-label={t("nav.mobile", "Navigation mobile")} className={`fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-all duration-300 ease-out md:hidden ${hidden ? "translate-y-[140%] opacity-0" : "translate-y-0 opacity-100"}`}>
        <div className="relative flex h-[68px] w-full max-w-md items-center justify-between rounded-[28px] border border-white/30 bg-white/65 px-2 shadow-[0_18px_55px_rgba(67,24,130,0.28)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/55">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]"><div className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-fuchsia-400/20 blur-2xl"/><div className="absolute -right-8 -bottom-10 h-28 w-28 rounded-full bg-sky-400/20 blur-2xl"/><div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent"/></div>
          <MobileNavLink {...navItems[0]} active={isActive(navItems[0].href)} />
          <MobileNavLink {...navItems[1]} active={isActive(navItems[1].href)} />
          <button type="button" onClick={() => setCreateMenuOpen((value) => !value)} aria-label={t("nav.createPost", "Créer")} aria-expanded={createMenuOpen} className="relative z-10 -mt-8 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-kelo-gradient text-white shadow-[0_12px_32px_rgba(139,92,246,0.45)] transition-all duration-200 hover:scale-105 active:scale-95"><span className="absolute inset-0 rounded-full border border-white/35"/><Plus className={`relative h-7 w-7 transition-transform duration-200 ${createMenuOpen ? "rotate-45" : ""}`} strokeWidth={2.4}/></button>
          <MobileNavLink {...navItems[2]} active={isActive(navItems[2].href)} />
          <MobileNavLink {...navItems[3]} active={isActive(navItems[3].href)} />
          <MobileNavLink href={profileHref} label={t("nav.profile", "Profil")} icon={User} active={profileActive}/>
        </div>
      </nav>
    </>
  );
}

interface MobileNavLinkProps { href: string; label: string; icon: typeof Home; active: boolean; }
function MobileNavLink({ href, label, icon: Icon, active }: MobileNavLinkProps) {
  return <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className="relative z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-200 active:scale-90">
    {active && <span className="absolute inset-1 rounded-2xl bg-kelo-gradient shadow-[0_7px_18px_rgba(139,92,246,0.28)]"/>}
    <Icon className={`relative h-[21px] w-[21px] transition-colors ${active ? "text-white" : "text-kelo-muted"}`} strokeWidth={active ? 2.4 : 2}/>
    {active && <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-white"/>}
  </Link>;
}
