"use client";

import { Bell, ChevronRight, Eye, FileText, Globe2, Languages, MessageCircleMore, Palette, Shield, SlidersHorizontal, UserRound } from "lucide-react";
import { useTranslation } from "@/components/providers/TranslationProvider";

export type SettingsSection = "account" | "identity" | "moderation" | "appearance" | "notifications" | "language" | "privacy" | "messaging" | "legal";
interface SettingsNavProps { active: SettingsSection; onChange: (section: SettingsSection) => void; }
type SettingsItem = { key: SettingsSection; labelKey: string; fallback: string; descriptionKey: string; descriptionFallback: string; icon: React.ComponentType<{ className?: string }>; };

const GROUPS: Array<{ titleKey: string; titleFallback: string; items: SettingsItem[] }> = [
  { titleKey:"settings.group.account",titleFallback:"Compte", items:[
    {key:"account",labelKey:"settings.account",fallback:"Compte et sécurité",descriptionKey:"settings.account.description",descriptionFallback:"Email, mot de passe et accès aux applications",icon:UserRound},
    {key:"identity",labelKey:"settings.identity",fallback:"Identité et domaine",descriptionKey:"settings.identity.description",descriptionFallback:"Handle AT Protocol, DID et domaine personnalisé",icon:Globe2},
    {key:"privacy",labelKey:"settings.privacy",fallback:"Confidentialité",descriptionKey:"settings.privacy.description",descriptionFallback:"Données, visibilité et options avancées",icon:Shield},
  ]},
  { titleKey:"settings.group.preferences",titleFallback:"Préférences", items:[
    {key:"appearance",labelKey:"settings.display",fallback:"Affichage",descriptionKey:"settings.display.description",descriptionFallback:"Thème, couleurs, taille du texte et animations",icon:Palette},
    {key:"language",labelKey:"settings.languageContent",fallback:"Langues et centres d’intérêt",descriptionKey:"settings.languageContent.description",descriptionFallback:"Langue de Kelo Social, langues du fil et sujets préférés",icon:Languages},
    {key:"notifications",labelKey:"settings.notifications",fallback:"Notifications et flux",descriptionKey:"settings.notifications.description",descriptionFallback:"Notifications, fils et contenu affiché",icon:Bell},
    {key:"messaging",labelKey:"settings.messaging",fallback:"Messagerie",descriptionKey:"settings.messaging.description",descriptionFallback:"Messages privés et invitations de groupe",icon:MessageCircleMore},
  ]},
  { titleKey:"settings.group.safety",titleFallback:"Sécurité et contenu", items:[
    {key:"moderation",labelKey:"settings.moderation",fallback:"Modération",descriptionKey:"settings.moderation.description",descriptionFallback:"Comptes bloqués, masqués et contenu sensible",icon:Eye},
  ]},
  { titleKey:"settings.group.info",titleFallback:"Informations", items:[
    {key:"legal",labelKey:"settings.legal",fallback:"Informations juridiques",descriptionKey:"settings.legal.description",descriptionFallback:"Mentions légales et documents applicables",icon:FileText},
  ]},
];

const COMPACT_ITEMS=GROUPS.flatMap(g=>g.items);

export default function SettingsNav({active,onChange}:SettingsNavProps){
  const {t}=useTranslation();
  const current=COMPACT_ITEMS.find(item=>item.key===active) ?? COMPACT_ITEMS[0];

  return (
    <>
      {/* Mobile: compact native selector instead of a large grid of cards. */}
      <div className="border-b border-kelo-border bg-white p-3 sm:p-4 md:hidden">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-kelo-muted">
            {t("settings.sections","Section des paramètres")}
          </span>
          <select
            value={active}
            onChange={(event)=>onChange(event.target.value as SettingsSection)}
            className="min-h-12 w-full rounded-2xl border border-kelo-border bg-kelo-background px-4 text-sm font-bold text-kelo-text outline-none focus:border-kelo-primary focus:ring-2 focus:ring-kelo-primary/20"
            aria-label={t("settings.sections","Section des paramètres")}
          >
            {GROUPS.map(group=>(
              <optgroup key={group.titleKey} label={t(group.titleKey,group.titleFallback)}>
                {group.items.map(item=>(
                  <option key={item.key} value={item.key}>{t(item.labelKey,item.fallback)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="mt-2 flex items-center gap-2 text-xs text-kelo-muted">
          <current.icon className="h-4 w-4 shrink-0 text-kelo-primary" />
          <span className="truncate">{t(current.descriptionKey,current.descriptionFallback)}</span>
        </div>
      </div>

      {/* Tablet + desktop: persistent navigation column. */}
      <nav aria-label={t("settings.sections","Sections des paramètres")} className="hidden h-full w-full bg-white md:block">
        {GROUPS.map(group=>(
          <section key={group.titleKey} className="border-b border-kelo-border py-3 last:border-b-0">
            <h2 className="px-3 pb-2 text-xs font-bold uppercase tracking-wide text-kelo-muted lg:px-4 xl:px-5">
              {t(group.titleKey,group.titleFallback)}
            </h2>
            <div>
              {group.items.map(item=>{
                const Icon=item.icon,selected=active===item.key;
                return (
                  <button key={item.key} type="button" onClick={()=>onChange(item.key)}
                    className={`flex w-full items-center gap-2.5 px-3 py-3 text-left transition-colors lg:gap-3 lg:px-4 lg:py-3.5 xl:px-5 ${selected?"bg-kelo-background":"hover:bg-kelo-background/70"}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full lg:h-9 lg:w-9 ${selected?"bg-kelo-primary/10 text-kelo-primary":"bg-kelo-background text-kelo-text"}`}>
                      <Icon className="h-[18px] w-[18px]"/>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-kelo-text lg:text-[15px]">{t(item.labelKey,item.fallback)}</span>
                      <span className="mt-0.5 hidden text-[11px] leading-4 text-kelo-muted lg:block xl:text-xs">{t(item.descriptionKey,item.descriptionFallback)}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-kelo-muted lg:h-5 lg:w-5"/>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <div className="border-t border-kelo-border px-3 py-4 text-xs text-kelo-muted lg:px-4 xl:px-5">
          <div className="flex items-start gap-2">
            <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0"/>
            <span>{t("settings.storageNotice","Les réglages sont enregistrés sur cet appareil ou via AT Protocol selon l’option.")}</span>
          </div>
        </div>
      </nav>
    </>
  );
}
