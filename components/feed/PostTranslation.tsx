"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import VerificationRequiredDialog from "@/components/verification/VerificationRequiredDialog";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";
import { getKeloContentPreferences, resolvedInterfaceLanguage } from "@/lib/kelo-language-preferences";
import { translateKeloText } from "@/lib/kelo-browser-translate";

export default function PostTranslation({ text }: { text: string }) {
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [engine, setEngine] = useState<"browser" | "server" | "cache" | "">("");
  const [verificationOpen, setVerificationOpen] = useState(false);
  const { checked, identityVerified } = useIdentityVerification();

  if (!text?.trim()) return null;

  const translate = async () => {
    if (!checked) return;
    if (!identityVerified) {
      setVerificationOpen(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const target = resolvedInterfaceLanguage(getKeloContentPreferences().interfaceLanguage);
      const result = await translateKeloText(text, target);
      setTranslated(result.translation);
      setEngine(result.engine);
    } catch {
      setError("Traduction indisponible sur cet appareil pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={translate} disabled={loading || !checked} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-kelo-primary hover:bg-kelo-primary/10 disabled:opacity-50">
        <Languages className="h-4 w-4" />
        {loading ? "Traduction…" : translated ? "Retraduire" : "Traduire"}
      </button>
      {translated && <div className="mt-1 rounded-xl bg-kelo-background p-3 text-sm leading-relaxed text-kelo-text"><div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-wide text-kelo-muted"><span>Traduction</span><span className="normal-case font-medium">{engine === "browser" ? "sur votre appareil" : engine === "cache" ? "mise en cache" : "Kelo Translate"}</span></div>{translated}</div>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      <VerificationRequiredDialog open={verificationOpen} onClose={() => setVerificationOpen(false)} />
    </div>
  );
}
