"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, ShieldAlert } from "lucide-react";

import {
  extractPostSafetyLabels,
  getCachedContentSafetyPrefs,
  getSafetyLabelTitle,
  loadContentSafetyPrefs,
  resolvePostVisibility,
  subscribeContentSafetyPrefs,
  type ContentSafetyPrefs,
} from "@/lib/atproto/content-safety";

interface SensitiveContentGateProps {
  post: any;
  children: React.ReactNode;
}

export default function SensitiveContentGate({
  post,
  children,
}: SensitiveContentGateProps) {
  const [prefs, setPrefs] = useState<ContentSafetyPrefs>(() =>
    getCachedContentSafetyPrefs()
  );
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let active = true;

    loadContentSafetyPrefs().then((next) => {
      if (active) setPrefs(next);
    });

    const unsubscribe = subscribeContentSafetyPrefs((next) => {
      if (active) setPrefs(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const labels = useMemo(() => extractPostSafetyLabels(post), [post]);
  const decision = useMemo(
    () => resolvePostVisibility(labels, prefs),
    [labels, prefs]
  );

  if (labels.length === 0 || decision.mode === "show" || revealed) {
    return <>{children}</>;
  }

  const title = decision.label
    ? getSafetyLabelTitle(decision.label)
    : "Contenu sensible";

  if (decision.mode === "hide") {
    return (
      <div
        className="my-3 rounded-2xl border border-kelo-border bg-kelo-background p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-kelo-muted" />
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-kelo-text">
              Publication masquée
            </p>
            <p className="mt-1 text-xs leading-relaxed text-kelo-muted">
              {title}. Ce contenu est masqué selon vos préférences de modération.
            </p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-3 text-xs font-bold text-kelo-primary hover:underline"
            >
              Afficher quand même
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="my-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-amber-950">
            Avertissement de contenu
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
            Cette publication est signalée comme : {title}.
          </p>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm"
          >
            <Eye className="h-3.5 w-3.5" />
            Voir la publication
          </button>
        </div>
      </div>
    </div>
  );
}
