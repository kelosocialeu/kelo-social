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
  { titleKey:"settings.group.safety",titleFallback:"Sécurité et contenu", items:[{key:"moderation",labelKey:"settings.moderation",fallback:"Modération",descriptionKey:"settings.moderation.description",descriptionFallback:"Comptes bloqués, masqués et contenu sensible",icon:Eye}]},
  { titleKey:"settings.group.info",titleFallback:"Informations", items:[{key:"legal",labelKey:"settings.legal",fallback:"Informations juridiques",descriptionKey:"settings.legal.description",descriptionFallback:"Mentions légales et documents applicables",icon:FileText}]},
];
const COMPACT_ITEMS=GROUPS.flatMap(g=>g.items);

export default function SettingsNav({active,onChange}:SettingsNavProps){
  const {t}=useTranslation();
  return <>
    <nav aria-label={t("settings.sections","Sections des paramètres")} className="border-b border-kelo-border bg-white lg:hidden"><div className="p-3 sm:p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-kelo-muted">{t("settings.all","Tous les paramètres")}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{COMPACT_ITEMS.map(item=>{const Icon=item.icon,selected=active===item.key;return <button key={item.key} type="button" onClick={()=>onChange(item.key)} aria-pressed={selected} className={`flex min-h-[78px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl border p-3 text-left transition ${selected?"border-kelo-primary bg-kelo-primary/10 text-kelo-primary":"border-kelo-border bg-white text-kelo-text active:bg-kelo-background"}`}><Icon className="h-5 w-5 shrink-0"/><span className="w-full break-words text-xs font-extrabold leading-4 sm:text-sm">{t(item.labelKey,item.fallback)}</span></button>})}</div></div></nav>
    <nav aria-label={t("settings.sections","Sections des paramètres")} className="hidden w-full bg-white lg:block">{GROUPS.map(group=><section key={group.titleKey} className="border-b border-kelo-border py-3 last:border-b-0"><h2 className="px-4 pb-2 text-xs font-bold uppercase tracking-wide text-kelo-muted xl:px-5">{t(group.titleKey,group.titleFallback)}</h2><div>{group.items.map(item=>{const Icon=item.icon,selected=active===item.key;return <button key={item.key} type="button" onClick={()=>onChange(item.key)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors xl:px-5 ${selected?"bg-kelo-background":"hover:bg-kelo-background/70"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kelo-background text-kelo-text"><Icon className="h-[19px] w-[19px]"/></span><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-kelo-text">{t(item.labelKey,item.fallback)}</span><span className="mt-0.5 block text-xs leading-5 text-kelo-muted">{t(item.descriptionKey,item.descriptionFallback)}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-kelo-muted"/></button>})}</div></section>)}<div className="border-t border-kelo-border px-4 py-4 text-xs text-kelo-muted xl:px-5"><div className="flex items-start gap-2"><SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0"/><span>{t("settings.storageNotice","Les réglages sont enregistrés sur cet appareil ou via AT Protocol selon l’option.")}</span></div></div></nav>
  </>
}
