"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Newspaper,
  Search,
  Bell,
  MessageCircle,
  Hash,
  ListChecks,
  Bookmark,
  User,
  Settings,
  ShieldCheck,
  PenSquare,
  LogOut,
} from "lucide-react";
import Logo from "@/components/ui/Logo";

interface SidebarProps {
  handle: string;
  isAdmin?: boolean;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { href: "/feed", label: "Accueil", icon: Home },
  { href: "/feed", label: "Actualités", icon: Newspaper },
  { href: "/search", label: "Explorer", icon: Search },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/messages", label: "Discussions", icon: MessageCircle },
  { href: "/feed", label: "Fils d'actu", icon: Hash },
  { href: "/lists", label: "Listes", icon: ListChecks },
  { href: "/bookmarks", label: "Conservés", icon: Bookmark },
  { href: "/profile", label: "Profil", icon: User },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export default function Sidebar({ handle, isAdmin, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col justify-between border-r border-kelo-border bg-white p-6 md:flex">
      <div>
        <div className="mb-8 flex items-center gap-2 px-2">
          <Logo className="h-9 w-auto" />
          <span className="text-lg font-extrabold text-kelo-text">Kelo</span>
        </div>

        <nav className="flex flex-col gap-1 text-base font-semibold text-kelo-text">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`flex items-center gap-4 rounded-2xl p-3 transition-colors ${
                  active
                    ? "bg-kelo-gradient text-white"
                    : "text-kelo-text hover:bg-kelo-background"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-4 rounded-2xl p-3 transition-colors ${
                pathname === "/admin"
                  ? "bg-kelo-gradient text-white"
                  : "text-kelo-secondary hover:bg-kelo-background"
              }`}
            >
              <ShieldCheck className="h-5 w-5" />
              Panneau Admin
            </Link>
          )}
        </nav>
      </div>

      <div className="border-t border-kelo-border pt-4">
        <Link
          href="/feed"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-kelo-gradient py-3 font-bold text-white transition-all hover:scale-[1.02] hover:shadow-kelo active:scale-95"
        >
          <PenSquare className="h-4 w-4" />
          Nouveau post
        </Link>

        <div className="mb-2 truncate px-1 text-xs text-kelo-muted">
          Connecté : <span className="font-bold text-kelo-text">@{handle || "invité"}</span>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-kelo-background py-2.5 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
