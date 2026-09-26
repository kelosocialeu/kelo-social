"use client";

import { Bell, ChevronRight, Eye, FileText, Globe2, Languages, MessageCircleMore, Palette, Shield, UserRound } from "lucide-react";
import { useTranslation } from "@/components/providers/TranslationProvider";

export type SettingsSection = "account" | "identity" | "moderation" | "appearance" | "notifications" | "language" | "privacy" | "messaging" | "legal";
interface SettingsNavProps { active: SettingsSection; onChange: (section: SettingsSection) => void; }
type SettingsItem = { key: SettingsSection; labelKey: string; fallback: string; descriptionKey: string; descriptionFallback: string; icon: React.ComponentType<{ className?: string }>; };

const GROUPS: Array<{ titleKey: string; titleFallback: string; items: SettingsItem[] }> = [
  { titleKey:"settings.group.account",titleFallback:"Compte",items:[
    {key:"account",labelKey:"settings.account",fallback:"Compte et sécurité",descriptionKey:"settings.account.description",descriptionFallback:"Accès, mot de passe et applications",icon:UserRound},
    {key:"identity",labelKey:"settings.identity",fallback:"Identité et domaine",descriptionKey:"settings.identity.description",descriptionFallback:"Handle, DID et domaine personnalisé",icon:Globe2},
    {key:"privacy",labelKey:"settings.privacy",fallback:"Confidentialité",descriptionKey:"settings.privacy.description",descriptionFallback:"Données et visibilité",icon:Shield},
  ]},
  { titleKey:"settings.group.preferences",titleFallback:"Préférences",items:[
    {key:"appearance",labelKey:"settings.display",fallback:"Affichage",descriptionKey:"settings.display.description",descriptionFallback:"Thème, couleurs, texte et animations",icon:Palette},
    {key:"language",labelKey:"settings.languageContent",fallback:"Langues et centres d’intérêt",descriptionKey:"settings.languageContent.description",descriptionFallback:"Langues, fil et sujets préférés",icon:Languages},
    {key:"notifications",labelKey:"settings.notifications",fallback:"Notifications et flux",descriptionKey:"settings.notifications.description",descriptionFallback:"Notifications et contenu affiché",icon:Bell},
    {key:"messaging",labelKey:"settings.messaging",fallback:"Messagerie",descriptionKey:"settings.messaging.description",descriptionFallback:"Messages privés et invitations",icon:MessageCircleMore},
  ]},
  { titleKey:"settings.group.safety",titleFallback:"Sécurité et contenu",items:[
    {key:"moderation",labelKey:"settings.moderation",fallback:"Modération",descriptionKey:"settings.moderation.description",descriptionFallback:"Comptes bloqués, masqués et contenu",icon:Eye},
  ]},
  { titleKey:"settings.group.info",titleFallback:"Informations",items:[
    {key:"legal",labelKey:"settings.legal",fallback:"Informations juridiques",descriptionKey:"settings.legal.description",descriptionFallback:"Mentions légales et documents",icon:FileText},
  ]},
];
const ITEMS=GROUPS.flatMap(group=>group.items);

export default function SettingsNav({active,onChange}:SettingsNavProps){
  const {t}=useTranslation();
  return (
    <>
      <div className="settings-mobile-nav md:hidden">
        <div className="settings-mobile-scroll" role="tablist" aria-label={t("settings.sections","Sections des paramètres")}>
          {GROUPS.map(group=>group.items.map(item=>{
            const Icon=item.icon, selected=active===item.key;
            return <button key={item.key} type="button" role="tab" aria-selected={selected} onClick={()=>onChange(item.key)}
              className={`settings-mobile-item ${selected?"is-active":""}`}>
              <span className="settings-mobile-icon"><Icon className="h-[18px] w-[18px]"/></span>
              <span>{t(item.labelKey,item.fallback)}</span>
            </button>;
          }))}
        </div>
      </div>

      <nav className="settings-desktop-nav hidden md:block" aria-label={t("settings.sections","Sections des paramètres")}>
        {GROUPS.map(group=>(
          <section key={group.titleKey} className="settings-nav-group">
            <h2>{t(group.titleKey,group.titleFallback)}</h2>
            <div className="space-y-1">
              {group.items.map(item=>{
                const Icon=item.icon, selected=active===item.key;
                return <button key={item.key} type="button" onClick={()=>onChange(item.key)}
                  className={`settings-nav-item ${selected?"is-active":""}`}>
                  <span className="settings-nav-icon"><Icon className="h-[18px] w-[18px]"/></span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="settings-nav-label">{t(item.labelKey,item.fallback)}</span>
                    <span className="settings-nav-description">{t(item.descriptionKey,item.descriptionFallback)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-40"/>
                </button>;
              })}
            </div>
          </section>
        ))}
      </nav>
    </>
  );
}

export { ITEMS as SETTINGS_ITEMS };
