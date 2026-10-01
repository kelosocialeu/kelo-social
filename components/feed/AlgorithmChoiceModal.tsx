"use client";

import { Check, Clock3, Sparkles } from "lucide-react";
import { useTranslation } from "@/components/providers/TranslationProvider";
import type { KeloAlgorithmLevel } from "@/lib/kelo-algorithm-preference";

const LEVELS: Array<{
  id: KeloAlgorithmLevel;
  title: string;
  duration: string;
  description: string;
  gradient: string;
}> = [
  {
    id: "very-low",
    title: "Très peu",
    duration: "Environ 30 min/jour",
    description: "Personnalisation légère, basée sur votre langue et vos centres d’intérêt, avec davantage de découverte.",
    gradient: "from-[#22D3EE] to-[#2563FF]",
  },
  {
    id: "medium",
    title: "Moyen",
    duration: "Environ 1 h/jour",
    description: "Un équilibre entre personnalisation, découverte et continuité des recommandations.",
    gradient: "from-[#2563FF] to-[#6D5DFB]",
  },
  {
    id: "medium-addictive",
    title: "Addictif moyen",
    duration: "Environ 2 h/jour",
    description: "Une personnalisation plus soutenue et des recommandations plus continues.",
    gradient: "from-[#6D5DFB] to-[#EC4899]",
  },
  {
    id: "addictive",
    title: "Addictif",
    duration: "Sans limite de durée",
    description: "Le niveau de personnalisation le plus intense, sans objectif de durée maximale.",
    gradient: "from-[#EC4899] to-[#F59E0B]",
  },
];

type Props = {
  saving: boolean;
  onChoose: (level: KeloAlgorithmLevel) => void;
};

export default function AlgorithmChoiceModal({ saving, onChoose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kelo-algorithm-choice-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/60 bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563FF] to-[#8B5CFF] text-white shadow-lg">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 id="kelo-algorithm-choice-title" className="mt-4 text-2xl font-black tracking-tight text-kelo-text sm:text-3xl">
            {t("algorithm.choice.title", "Choisissez votre algorithme")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-kelo-muted">
            {t("algorithm.choice.description", "Avant d’afficher votre fil, choisissez le niveau de personnalisation que vous souhaitez. Votre choix sera enregistré sur votre compte.")}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              disabled={saving}
              onClick={() => onChoose(level.id)}
              className="group rounded-2xl border border-kelo-border bg-kelo-surface p-4 text-left transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg disabled:cursor-wait disabled:opacity-60"
            >
              <div className={"mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r " + level.gradient} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-kelo-text">{level.title}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-violet-600">
                    <Clock3 className="h-3.5 w-3.5" />
                    {level.duration}
                  </div>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <Check className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-kelo-muted">{level.description}</p>
            </button>
          ))}
        </div>

        {saving && (
          <p className="mt-4 text-center text-sm font-semibold text-violet-600">
            {t("common.loading", "Enregistrement...")}
          </p>
        )}
      </div>
    </div>
  );
}
