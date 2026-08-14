"use client";

import { Bell, ChevronRight, Eye, FileText, Globe2, Languages, Palette, Shield, SlidersHorizontal, UserRound } from "lucide-react";

export type SettingsSection = "account" | "identity" | "moderation" | "appearance" | "notifications" | "language" | "privacy" | "legal";
interface SettingsNavProps { active: SettingsSection; onChange: (section: SettingsSection) => void; }
type SettingsItem = { key: SettingsSection; label: string; description: string; icon: React.ComponentType<{ className?: string }>; };
const GROUPS: Array<{ title: string; items: SettingsItem[] }> = [
  { title:"Compte", items:[
    {key:"account",label:"Compte et sécurité",description:"Email, mot de passe et accès aux applications",icon:UserRound},
    {key:"identity",label:"Identité et domaine",description:"Handle AT Protocol, DID et domaine personnalisé",icon:Globe2},
    {key:"privacy",label:"Confidentialité",description:"Données, visibilité et options avancées",icon:Shield},
  ]},
  { title:"Préférences", items:[
    {key:"appearance",label:"Affichage",description:"Thème, couleurs, taille du texte et animations",icon:Palette},
    {key:"language",label:"Langues et centres d’intérêt",description:"Langue de Kelo Social, langues du fil et sujets préférés",icon:Languages},
    {key:"notifications",label:"Notifications et flux",description:"Notifications, fils et contenu affiché",icon:Bell},
  ]},
  { title:"Sécurité et contenu", items:[{key:"moderation",label:"Modération",description:"Comptes bloqués, masqués et contenu sensible",icon:Eye}]},
  { title:"Informations", items:[{key:"legal",label:"Informations juridiques",description:"Mentions légales et documents applicables",icon:FileText}]},
];
const COMPACT_ITEMS=GROUPS.flatMap(g=>g.items);
export default function SettingsNav({active,onChange}:SettingsNavProps){return <>
<nav aria-label="Sections des paramètres" className="border-b border-kelo-border bg-white lg:hidden"><div className="p-3 sm:p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wide text-kelo-muted">Tous les paramètres</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{COMPACT_ITEMS.map(item=>{const Icon=item.icon,selected=active===item.key;return <button key={item.key} type="button" onClick={()=>onChange(item.key)} aria-pressed={selected} className={`flex min-h-[78px] min-w-0 flex-col items-start justify-between gap-2 rounded-2xl border p-3 text-left transition ${selected?"border-kelo-primary bg-kelo-primary/10 text-kelo-primary":"border-kelo-border bg-white text-kelo-text active:bg-kelo-background"}`}><Icon className="h-5 w-5 shrink-0"/><span className="w-full break-words text-xs font-extrabold leading-4 sm:text-sm">{item.label}</span></button>})}</div></div></nav>
<nav aria-label="Sections des paramètres" className="hidden w-full bg-white lg:block">{GROUPS.map(group=><section key={group.title} className="border-b border-kelo-border py-3 last:border-b-0"><h2 className="px-4 pb-2 text-xs font-bold uppercase tracking-wide text-kelo-muted xl:px-5">{group.title}</h2><div>{group.items.map(item=>{const Icon=item.icon,selected=active===item.key;return <button key={item.key} type="button" onClick={()=>onChange(item.key)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors xl:px-5 ${selected?"bg-kelo-background":"hover:bg-kelo-background/70"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kelo-background text-kelo-text"><Icon className="h-[19px] w-[19px]"/></span><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-kelo-text">{item.label}</span><span className="mt-0.5 block text-xs leading-5 text-kelo-muted">{item.description}</span></span><ChevronRight className="h-5 w-5 shrink-0 text-kelo-muted"/></button>})}</div></section>)}<div className="border-t border-kelo-border px-4 py-4 text-xs text-kelo-muted xl:px-5"><div className="flex items-start gap-2"><SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0"/><span>Les réglages sont enregistrés sur cet appareil ou via AT Protocol selon l’option.</span></div></div></nav></>}
