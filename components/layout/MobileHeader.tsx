"use client";

import { Menu } from "lucide-react";
import Logo from "@/components/ui/Logo";

interface MobileHeaderProps {
  onOpenMenu: () => void;
}

export default function MobileHeader({
  onOpenMenu,
}: MobileHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/30 bg-white/70 px-4 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-2xl md:hidden">
      <div className="relative flex h-14 items-center justify-center">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Ouvrir le menu"
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/55 text-kelo-text shadow-sm transition active:scale-95"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
          <span className="text-base font-extrabold text-kelo-text">
            Kelo
          </span>
        </div>
      </div>
    </header>
  );
}
