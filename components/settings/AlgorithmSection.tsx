"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Check, Clock3, Sparkles } from "lucide-react";
import { useTranslation } from "@/components/providers/TranslationProvider";

const LEVELS = [
  { id:"very-low", title:"Très peu", duration:"Environ 30 min/jour", description:"L’algorithme privilégie votre langue et vos centres d’intérêt, tout en introduisant aussi des contenus moins susceptibles de vous intéresser. L’objectif est de proposer une découverte mesurée puis de réduire progressivement l’intensité.", gradient:"from-[#22D3EE] to-[#2563FF]" },
  { id:"medium", title:"Moyen", duration:"Environ 1 h/jour", description:"Même principe de personnalisation, avec davantage de continuité dans les recommandations. L’algorithme cherche à maintenir votre attention autour d’une heure avant de réduire progressivement son intensité.", gradient:"from-[#2563FF] to-[#6D5DFB]" },
  { id:"medium-addictive", title:"Addictif moyen", duration:"Environ 2 h/jour", description:"La personnalisation et la continuité des recommandations sont renforcées. L’algorithme cherche à prolonger davantage votre session, autour d’une durée d’environ deux heures.", gradient:"from-[#6D5DFB] to-[#EC4899]" },
  { id:"addictive", title:"Addictif", duration:"Sans limite de durée", description:"Le niveau le plus intense cherche à maximiser la durée passée sur Kelo Social en adaptant continuellement les recommandations aux signaux d’engagement.", gradient:"from-[#EC4899] to-[#F59E0B]" },
] as const;

export default function AlgorithmSection(){
  const {t}=useTranslation();
  const [selected,setSelected]=useState("medium");

  useEffect(()=>{
    const saved=window.localStorage.getItem("kelo-algorithm-level");
    if(saved && LEVELS.some(level=>level.id===saved)) setSelected(saved);
  },[]);

  const choose=(id:string)=>{
    setSelected(id);
    window.localStorage.setItem("kelo-algorithm-level",id);
  };

  return <div className="space-y-5">
    <div className="settings-card overflow-hidden">
      <div className="relative p-5 sm:p-6">
        <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl"/>
        <div className="relative flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563FF] to-[#8B5CFF] text-white shadow-lg">
            <BrainCircuit className="h-5 w-5"/>
          </div>
          <div>
            <h3 className="text-lg font-black">{t("settings.algorithm.title","Votre algorithme")}</h3>
            <p className="mt-1 text-sm leading-6 text-kelo-muted">{t("settings.algorithm.intro","Choisissez le niveau d’intervention algorithmique que vous souhaitez pour votre fil.")}</p>
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-violet-200/60 bg-violet-50/60 p-4 dark:border-violet-500/20 dark:bg-violet-500/10">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-500"/>
          <p className="text-xs leading-5 text-kelo-muted"><strong className="text-kelo-text">Algorithmes Kelo Social.</strong> Ces algorithmes sont imaginés, conçus et développés par Kelo Social.</p>
        </div>
      </div>
    </div>

    <div className="grid gap-3 xl:grid-cols-2">
      {LEVELS.map((level,index)=>{
        const active=selected===level.id;
        return <button key={level.id} type="button" onClick={()=>choose(level.id)} aria-pressed={active}
          className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 ${active ? "border-violet-400/70 bg-violet-50/70 shadow-lg shadow-violet-500/10 dark:border-violet-400/50 dark:bg-violet-500/10" : "border-kelo-border bg-kelo-surface hover:border-violet-300"}`}>
          <div className={`mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r ${level.gradient} transition-all group-hover:w-16`}/>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.16em] text-kelo-muted">Niveau {index+1}</span>
              <h4 className="mt-1 text-lg font-black">{level.title}</h4>
            </div>
            {active && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-white"><Check className="h-4 w-4"/></span>}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-300"><Clock3 className="h-3.5 w-3.5"/>{level.duration}</div>
          <p className="mt-3 text-sm leading-6 text-kelo-muted">{level.description}</p>
        </button>;
      })}
    </div>
    <p className="px-1 text-xs text-kelo-muted">Votre choix est enregistré sur cet appareil. Il sera utilisé par le système de recommandation lorsque le contrôle algorithmique sera appliqué au fil.</p>
  </div>;
}
