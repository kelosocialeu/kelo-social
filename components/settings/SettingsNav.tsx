"use client";

import {
  Bell,
  ChevronRight,
  Eye,
  Globe2,
  Palette,
  Shield,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

export type SettingsSection =
  | "account"
  | "identity"
  | "moderation"
  | "appearance"
  | "notifications"
  | "privacy";

interface SettingsNavProps {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
}

type SettingsItem = {
  key: SettingsSection;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const GROUPS: Array<{
  title: string;
  items: SettingsItem[];
}> = [
  {
    title: "Compte",
    items: [
      {
        key: "account",
        label: "Compte et sécurité",
        description: "Email, mot de passe et accès aux applications",
        icon: UserRound,
      },
      {
        key: "identity",
        label: "Identité et domaine",
        description: "Handle AT Protocol, DID et domaine personnalisé",
        icon: Globe2,
      },
      {
        key: "privacy",
        label: "Confidentialité",
        description: "Données, visibilité et options avancées",
        icon: Shield,
      },
    ],
  },
  {
    title: "Préférences",
    items: [
      {
        key: "appearance",
        label: "Affichage",
        description: "Thème, taille du texte et animations",
        icon: Palette,
      },
      {
        key: "notifications",
        label: "Notifications et flux",
        description: "Notifications, fils et contenu affiché",
        icon: Bell,
      },
    ],
  },
  {
    title: "Sécurité et contenu",
    items: [
      {
        key: "moderation",
        label: "Modération",
        description: "Comptes bloqués, masqués et contenu sensible",
        icon: Eye,
      },
    ],
  },
];

const COMPACT_ITEMS = GROUPS.flatMap((group) => group.items);

export default function SettingsNav({
  active,
  onChange,
}: SettingsNavProps) {
  return (
    <>
      <nav
        aria-label="Sections des paramètres"
        className="border-b border-kelo-border bg-white lg:hidden"
      >
        <div className="overflow-x-auto px-3 py-3 sm:px-4">
          <div className="flex min-w-max gap-2">
            {COMPACT_ITEMS.map((item) => {
              const Icon = item.icon;
              const selected = active === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChange(item.key)}
                  aria-pressed={selected}
                  className={`flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-bold transition ${
                    selected
                      ? "border-kelo-primary bg-kelo-primary/10 text-kelo-primary"
                      : "border-kelo-border bg-white text-kelo-text active:bg-kelo-background"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <nav
        aria-label="Sections des paramètres"
        className="hidden w-full bg-white lg:block"
      >
        {GROUPS.map((group) => (
          <section
            key={group.title}
            className="border-b border-kelo-border py-3 last:border-b-0"
          >
            <h2 className="px-4 pb-2 text-xs font-bold uppercase tracking-wide text-kelo-muted xl:px-5">
              {group.title}
            </h2>

            <div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const selected = active === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onChange(item.key)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors xl:px-5 ${
                      selected
                        ? "bg-kelo-background"
                        : "hover:bg-kelo-background/70"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kelo-background text-kelo-text">
                      <Icon className="h-[19px] w-[19px]" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-kelo-text">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-kelo-muted">
                        {item.description}
                      </span>
                    </span>

                    <ChevronRight className="h-5 w-5 shrink-0 text-kelo-muted" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <div className="border-t border-kelo-border px-4 py-4 text-xs text-kelo-muted xl:px-5">
          <div className="flex items-start gap-2">
            <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Les réglages sont enregistrés sur cet appareil ou via AT Protocol selon l’option.
            </span>
          </div>
        </div>
      </nav>
    </>
  );
}
