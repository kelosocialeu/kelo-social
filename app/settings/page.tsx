"use client";

import { useState } from "react";
import { LogOut, Settings2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import SettingsNav,{SettingsSection} from "@/components/settings/SettingsNav";
import AccountSection from "@/components/settings/AccountSection";
import RobotAccountSection from "@/components/settings/RobotAccountSection";
import IdentitySection from "@/components/settings/IdentitySection";
import DisplaySection from "@/components/settings/DisplaySection";
import ModerationSection from "@/components/settings/ModerationSection";
import PrivacySection from "@/components/settings/PrivacySection";
import NotificationFeedSection from "@/components/settings/NotificationFeedSection";
import LanguageContentSection from "@/components/settings/LanguageContentSection";
import MessagingSection from "@/components/settings/MessagingSection";
import LegalSection from "@/components/settings/LegalSection";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useTranslation } from "@/components/providers/TranslationProvider";

const SECTION_KEYS:Record<SettingsSection,[string,string]>={
  account:["settings.account","Compte et sécurité"],identity:["settings.identity","Identité et domaine"],moderation:["settings.moderation","Modération"],privacy:["settings.privacy","Confidentialité"],appearance:["settings.display","Affichage"],language:["settings.languageContent","Langues et centres d’intérêt"],notifications:["settings.notifications","Notifications et flux"],messaging:["settings.messaging","Messagerie"],legal:["settings.legal","Informations juridiques"],
};

export default function SettingsPage(){
  const {checked,handle}=useRequireAuth();
  const {t}=useTranslation();
  const [section,setSection]=useState<SettingsSection>("account");
  const [sectionKey,sectionFallback]=SECTION_KEYS[section];
  const sectionTitle=t(sectionKey,sectionFallback);
  const handleLogout=()=>{localStorage.clear();window.location.href="/login"};

  if(!checked)return <div className="flex min-h-screen items-center justify-center bg-kelo-background px-5 text-center font-sans text-kelo-muted">{t("common.loading","Vérification de votre session...")}</div>;

  return <div className="settings-page min-h-screen w-full font-sans text-kelo-text md:flex">
    <Sidebar handle={handle} onLogout={handleLogout}/>
    <main className="settings-main min-w-0 flex-1 pb-24 md:pb-8">
      <header className="settings-header">
        <div className="settings-header-inner">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="settings-header-icon"><Settings2 className="h-4 w-4"/></span>
              <span className="text-xs font-bold uppercase tracking-[.14em] text-kelo-muted">Kelo Social</span>
            </div>
            <h1>{t("settings.title","Paramètres")}</h1>
            {handle&&<p>@{handle}</p>}
          </div>
          <button type="button" onClick={handleLogout} className="settings-logout-mobile lg:hidden">
            <LogOut className="h-4 w-4"/><span className="hidden sm:inline">{t("nav.logout","Déconnexion")}</span>
          </button>
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <SettingsNav active={section} onChange={setSection}/>
          <div className="settings-sidebar-logout hidden lg:block">
            <button type="button" onClick={handleLogout}><LogOut className="h-[18px] w-[18px]"/>{t("nav.logout","Se déconnecter")}</button>
          </div>
        </aside>

        <section className="settings-content">
          <div className="settings-content-head">
            <div className="min-w-0">
              <p>{t("settings.title","Paramètres")}</p>
              <h2>{sectionTitle}</h2>
            </div>
          </div>
          <div className="settings-content-body">
            {section==="account"&&<><AccountSection/><RobotAccountSection/></>}
            {section==="identity"&&<IdentitySection/>}
            {section==="appearance"&&<DisplaySection/>}
            {section==="moderation"&&<ModerationSection/>}
            {section==="privacy"&&<PrivacySection/>}
            {section==="notifications"&&<NotificationFeedSection/>}
            {section==="language"&&<LanguageContentSection/>}
            {section==="messaging"&&<MessagingSection/>}
            {section==="legal"&&<LegalSection/>}
          </div>
        </section>
      </div>
    </main>
  </div>;
}
