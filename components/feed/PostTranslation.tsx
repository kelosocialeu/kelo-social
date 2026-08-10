"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { getKeloContentPreferences, resolvedInterfaceLanguage } from "@/lib/kelo-language-preferences";

export default function PostTranslation({ text }: { text: string }) {
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!text?.trim()) return null;
  const translate = async () => {
    setLoading(true); setError("");
    try {
      const target = resolvedInterfaceLanguage(getKeloContentPreferences().interfaceLanguage).split("-")[0];
      const res = await fetch("/api/translate", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({text,target}) });
      const data = await res.json();
      if (!res.ok || !data.translation) throw new Error(data.error || "translation failed");
      setTranslated(data.translation);
    } catch { setError("Traduction indisponible pour le moment."); }
    finally { setLoading(false); }
  };
  return <div className="mt-2" onClick={e=>e.stopPropagation()}>
    <button type="button" onClick={translate} disabled={loading} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-kelo-primary hover:bg-kelo-primary/10 disabled:opacity-50"><Languages className="h-4 w-4"/>{loading?"Traduction…":translated?"Retraduire":"Traduire"}</button>
    {translated&&<div className="mt-1 rounded-xl bg-kelo-background p-3 text-sm leading-relaxed text-kelo-text"><div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-kelo-muted">Traduction</div>{translated}</div>}
    {error&&<p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>;
}
