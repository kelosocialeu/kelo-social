"use client";

export type SettingsSection = "account" | "moderation" | "appearance" | "notifications" | "privacy";

interface SettingsNavProps {
  active: SettingsSection;
  onChange: (section: SettingsSection) => void;
}

const SECTIONS: { key: SettingsSection; label: string }[] = [
  { key: "account", label: "Compte & Sécurité" },
  { key: "moderation", label: "Modération & Contenu" },
  { key: "appearance", label: "Apparence & Ergonomie" },
  { key: "notifications", label: "Notifications & Flux" },
  { key: "privacy", label: "Confidentialité & Avancé" },
];

export default function SettingsNav({ active, onChange }: SettingsNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-kelo-border px-4 pt-4 text-sm font-bold">
      {SECTIONS.map((section) => (
        <button
          key={section.key}
          onClick={() => onChange(section.key)}
          className={`whitespace-nowrap rounded-t-xl px-4 py-2.5 transition-colors ${
            active === section.key
              ? "border-b-2 border-kelo-primary text-kelo-text"
              : "text-kelo-muted hover:text-kelo-text"
          }`}
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
