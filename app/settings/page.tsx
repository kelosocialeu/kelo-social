"use client";

import { useMemo, useState } from "react";
import { LogOut } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import SettingsNav, {
  SettingsSection,
} from "@/components/settings/SettingsNav";
import AccountSection from "@/components/settings/AccountSection";
import ModerationSection from "@/components/settings/ModerationSection";
import PrivacySection from "@/components/settings/PrivacySection";
import ComingSoonSection from "@/components/settings/ComingSoonSection";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const SECTION_TITLES: Record<SettingsSection, string> = {
  account: "Compte et sécurité",
  moderation: "Modération",
  privacy: "Confidentialité",
  appearance: "Apparence",
  notifications: "Notifications et flux",
};

export default function SettingsPage() {
  const { checked, handle } = useRequireAuth();
  const [section, setSection] =
    useState<SettingsSection>("account");

  const sectionTitle = useMemo(
    () => SECTION_TITLES[section],
    [section]
  );

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kelo-background font-sans text-kelo-muted">
        Vérification de votre session...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-kelo-background font-sans text-kelo-text">
      <Sidebar handle={handle} onLogout={handleLogout} />

      <main className="min-h-screen min-w-0 flex-1 bg-white pb-24 md:border-x md:border-kelo-border md:pb-0">
        <header className="sticky top-0 z-20 border-b border-kelo-border bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
          <h1 className="text-xl font-extrabold text-kelo-text">
            Paramètres
          </h1>
          {handle && (
            <p className="mt-0.5 text-sm text-kelo-muted">
              @{handle}
            </p>
          )}
        </header>

        <div className="mx-auto grid w-full max-w-5xl md:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="border-b border-kelo-border md:min-h-[calc(100vh-73px)] md:border-b-0 md:border-r">
            <SettingsNav
              active={section}
              onChange={setSection}
            />

            <div className="border-t border-kelo-border p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
                  <LogOut className="h-[19px] w-[19px]" />
                </span>
                Se déconnecter
              </button>
            </div>
          </aside>

          <section className="min-w-0 bg-white">
            <div className="border-b border-kelo-border px-4 py-4 sm:px-6">
              <h2 className="text-lg font-bold text-kelo-text">
                {sectionTitle}
              </h2>
            </div>

            <div className="settings-bluesky-section">
              {section === "account" && <AccountSection />}
              {section === "moderation" && (
                <ModerationSection />
              )}
              {section === "privacy" && <PrivacySection />}

              {section === "appearance" && (
                <ComingSoonSection
                  title="Apparence"
                  items={[
                    "Mode sombre, clair ou automatique",
                    "Taille du texte",
                    "Réduction des animations",
                    "Descriptions automatiques des images",
                  ]}
                />
              )}

              {section === "notifications" && (
                <ComingSoonSection
                  title="Notifications et flux"
                  items={[
                    "Choisir les notifications à recevoir",
                    "Réponses, mentions, abonnements et réactions",
                    "Masquer les réponses ou republications dans certains flux",
                    "Organiser les fils enregistrés",
                  ]}
                />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
