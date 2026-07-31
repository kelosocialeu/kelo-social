"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import SettingsNav, { SettingsSection } from "@/components/settings/SettingsNav";
import AccountSection from "@/components/settings/AccountSection";
import ModerationSection from "@/components/settings/ModerationSection";
import PrivacySection from "@/components/settings/PrivacySection";
import ComingSoonSection from "@/components/settings/ComingSoonSection";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function SettingsPage() {
  const { checked, handle } = useRequireAuth();
  const [section, setSection] = useState<SettingsSection>("account");

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
    <div className="flex min-h-screen justify-center bg-kelo-background font-sans text-kelo-text">
      <div className="flex w-full max-w-7xl">
        <Sidebar handle={handle} onLogout={handleLogout} />

        <main className="min-h-screen w-full max-w-3xl flex-grow border-r border-kelo-border bg-white shadow-kelo">
          <div className="border-b border-kelo-border p-4 pb-0">
            <h1 className="text-xl font-extrabold text-kelo-text">Paramètres</h1>
          </div>

          <SettingsNav active={section} onChange={setSection} />

          {section === "account" && <AccountSection />}
          {section === "moderation" && <ModerationSection />}
          {section === "privacy" && <PrivacySection />}
          {section === "appearance" && (
            <ComingSoonSection
              title="Apparence & Ergonomie"
              items={[
                "Mode sombre / clair / automatique",
                "Taille du texte",
                "Réduction des animations",
                "Description automatique des images (avec l'ajout des médias aux publications)",
              ]}
            />
          )}
          {section === "notifications" && (
            <ComingSoonSection
              title="Notifications & Flux"
              items={[
                "Filtrer les types de notifications affichées",
                "Masquer les réponses/reposts dans le fil « Pour vous »",
                "Réorganisation des fils enregistrés",
                "Découverte de flux algorithmiques sur-mesure",
              ]}
            />
          )}
        </main>
      </div>
    </div>
  );
}
