"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  getSavedAccounts,
  syncActiveAccount,
  switchSavedAccount,
} from "@/lib/session/account-storage";
import type { AtpSession } from "@/types/auth";

interface AccountSwitcherProps {
  compact?: boolean;
  onBeforeNavigate?: () => void;
}

type AccountProfile = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
};

function shortHandle(handle: string) {
  return handle.replace(/^@/, "");
}

function AccountAvatar({ avatar, handle, size = "md" }: { avatar?: string; handle: string; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-9 w-9" : "h-9 w-9";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={`Photo de profil de @${shortHandle(handle)}`}
        className={`${sizeClass} flex-shrink-0 rounded-full border border-kelo-border bg-kelo-background object-cover`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className={`flex ${sizeClass} flex-shrink-0 items-center justify-center rounded-full bg-kelo-gradient text-white`}>
      <UserRound className="h-4 w-4" />
    </span>
  );
}

export default function AccountSwitcher({ compact = false, onBeforeNavigate }: AccountSwitcherProps) {
  const router = useRouter();
  const { session } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AtpSession[]>([]);
  const [profiles, setProfiles] = useState<Record<string, AccountProfile>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshAccounts = () => {
    syncActiveAccount();
    setAccounts(getSavedAccounts());
  };

  useEffect(() => {
    refreshAccounts();

    const handleStorage = () => refreshAccounts();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("kelo-session-changed", handleStorage as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kelo-session-changed", handleStorage as EventListener);
    };
  }, [session?.did]);

  useEffect(() => {
    const uniqueDids = Array.from(
      new Set([
        ...accounts.map((account) => account.did),
        ...(session?.did ? [session.did] : []),
      ].filter(Boolean))
    );

    if (uniqueDids.length === 0) {
      setProfiles({});
      return;
    }

    const controller = new AbortController();

    const loadProfiles = async () => {
      try {
        const nextProfiles: Record<string, AccountProfile> = {};

        for (let index = 0; index < uniqueDids.length; index += 25) {
          const batch = uniqueDids.slice(index, index + 25);
          const params = new URLSearchParams();
          batch.forEach((did) => params.append("actors", did));

          const response = await fetch(
            `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params.toString()}`,
            {
              cache: "no-store",
              signal: controller.signal,
              headers: { Accept: "application/json" },
            }
          );

          if (!response.ok) continue;

          const data = (await response.json()) as { profiles?: AccountProfile[] };
          for (const profile of data.profiles || []) {
            if (profile.did) nextProfiles[profile.did] = profile;
          }
        }

        if (!controller.signal.aborted) {
          setProfiles((current) => ({ ...current, ...nextProfiles }));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.warn("Impossible de charger les photos de profil des comptes connectés.", error);
      }
    };

    void loadProfiles();
    return () => controller.abort();
  }, [accounts, session?.did]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const orderedAccounts = useMemo(() => {
    if (!session) return accounts;
    return [
      ...accounts.filter((account) => account.did === session.did),
      ...accounts.filter((account) => account.did !== session.did),
    ];
  }, [accounts, session]);

  const switchAccount = (account: AtpSession) => {
    if (account.did === session?.did) {
      setOpen(false);
      return;
    }
    if (!switchSavedAccount(account.did)) return;
    setOpen(false);
    onBeforeNavigate?.();
    window.location.assign("/feed");
  };

  const addAccount = () => {
    syncActiveAccount();
    setOpen(false);
    onBeforeNavigate?.();
    router.push("/login?addAccount=1");
  };

  const activeProfile = session?.did ? profiles[session.did] : undefined;

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex w-full touch-manipulation items-center rounded-2xl border border-kelo-border bg-white text-left transition hover:bg-kelo-background ${compact ? "gap-2 px-3 py-2" : "gap-3 px-3 py-3"}`}
      >
        <AccountAvatar avatar={activeProfile?.avatar} handle={session?.handle || "invité"} />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-kelo-muted">Compte actif</span>
          <span className="block truncate text-sm font-extrabold text-kelo-text">@{shortHandle(session?.handle || "invité")}</span>
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-kelo-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className={`z-[120] mt-2 w-full overflow-hidden rounded-2xl border border-kelo-border bg-white p-2 shadow-2xl ${compact ? "absolute bottom-full mb-2 left-0" : "relative"}`}
        >
          <div className="max-h-64 overflow-y-auto">
            {orderedAccounts.map((account) => {
              const active = account.did === session?.did;
              const profile = profiles[account.did];
              return (
                <button
                  key={account.did}
                  type="button"
                  role="menuitem"
                  onClick={() => switchAccount(account)}
                  className={`flex w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-kelo-background" : "hover:bg-kelo-background"}`}
                >
                  <AccountAvatar avatar={profile?.avatar} handle={account.handle} size="sm" />
                  <span className="min-w-0 flex-1">
                    {profile?.displayName && profile.displayName !== account.handle && (
                      <span className="block truncate text-sm font-extrabold text-kelo-text">{profile.displayName}</span>
                    )}
                    <span className={`block truncate ${profile?.displayName && profile.displayName !== account.handle ? "text-xs text-kelo-muted" : "text-sm font-bold text-kelo-text"}`}>
                      @{shortHandle(account.handle)}
                    </span>
                    <span className="block truncate text-[11px] text-kelo-muted">{account.pdsUrl.replace(/^https?:\/\//, "")}</span>
                  </span>
                  {active && <Check className="h-4 w-4 flex-shrink-0 text-kelo-primary" />}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={addAccount}
            className="mt-1 flex w-full touch-manipulation items-center gap-3 rounded-xl border-t border-kelo-border px-3 py-3 text-left font-bold text-kelo-primary hover:bg-kelo-background"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-kelo-primary/50">
              <Plus className="h-4 w-4" />
            </span>
            Ajouter un compte
          </button>
        </div>
      )}
    </div>
  );
}
