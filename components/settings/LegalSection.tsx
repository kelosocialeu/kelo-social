"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

export default function LegalSection(){
  return <div className="p-4 sm:p-6">
    <div className="rounded-2xl border border-kelo-border bg-white">
      <div className="border-b border-kelo-border p-4 sm:p-5">
        <h3 className="font-extrabold text-kelo-text">Documents juridiques de Kelo Social</h3>
        <p className="mt-1 text-sm text-kelo-muted">Consultez les informations légales et les règles applicables au service.</p>
      </div>
      <Link href="/legal-notice" className="flex items-center gap-3 p-4 transition hover:bg-kelo-background sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kelo-background"><FileText className="h-5 w-5"/></span>
        <span className="min-w-0 flex-1"><span className="block font-bold">Mentions légales</span><span className="mt-0.5 block text-xs text-kelo-muted">Éditeur, hébergement, propriété intellectuelle, responsabilité et droit applicable.</span></span>
        <ChevronRight className="h-5 w-5 shrink-0 text-kelo-muted"/>
      </Link>
    </div>
    <p className="mt-4 text-xs leading-5 text-kelo-muted">Les autres documents juridiques apparaîtront ici au fur et à mesure de leur validation.</p>
  </div>;
}
