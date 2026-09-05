"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { LockKeyhole, ShieldCheck, X } from "lucide-react";
import { useIdentityVerification } from "@/hooks/useIdentityVerification";

interface KeloIdFeatureLockProps {
  children: ReactNode;
  feature: string;
  mode?: "block" | "click";
  className?: string;
}

export default function KeloIdFeatureLock({ children, feature, mode = "click", className = "" }: KeloIdFeatureLockProps) {
  const { checked, identityVerified } = useIdentityVerification();
  const [open, setOpen] = useState(false);

  if (!checked || identityVerified) return <>{children}</>;

  const dialog = open ? (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-3xl border border-kelo-border bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-kelo-muted hover:bg-kelo-background"><X className="h-4 w-4" /></button>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kelo-gradient text-white"><ShieldCheck className="h-6 w-6" /></div>
        <h2 className="mt-4 text-xl font-extrabold text-kelo-text">Vérification Kelo ID requise</h2>
        <p className="mt-2 text-sm leading-6 text-kelo-muted">Pour accéder à <strong className="text-kelo-text">{feature}</strong>, vous devez d’abord vérifier votre compte avec Kelo ID.</p>
        <p className="mt-3 text-sm leading-6 text-kelo-muted">Cette fonctionnalité est réservée aux utilisateurs dont l’identité a été vérifiée.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => setOpen(false)} className="w-full rounded-full bg-kelo-background px-5 py-3 text-sm font-bold text-kelo-text">Plus tard</button>
          <Link href="/verify-account" className="w-full rounded-full bg-kelo-gradient px-5 py-3 text-center text-sm font-bold text-white">Se vérifier avec Kelo ID</Link>
        </div>
      </div>
    </div>
  ) : null;

  if (mode === "block") {
    return <div className={`relative ${className}`}>
      <div className="pointer-events-none select-none blur-[2px] opacity-40" aria-hidden="true">{children}</div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <button type="button" onClick={() => setOpen(true)} className="flex max-w-sm flex-col items-center rounded-3xl border border-kelo-border bg-white/95 p-6 text-center shadow-xl backdrop-blur">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kelo-gradient text-white"><LockKeyhole className="h-6 w-6" /></span>
          <span className="mt-3 text-base font-extrabold text-kelo-text">Fonctionnalité réservée aux comptes vérifiés</span>
          <span className="mt-1 text-sm text-kelo-muted">Cliquez pour découvrir comment débloquer {feature}.</span>
        </button>
      </div>
      {dialog}
    </div>;
  }

  return <>
    <div className={`relative ${className}`} onClickCapture={(event) => { event.preventDefault(); event.stopPropagation(); setOpen(true); }}>
      <div className="pointer-events-none">{children}</div>
      <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow"><LockKeyhole className="h-4 w-4 text-kelo-primary" /></span>
    </div>
    {dialog}
  </>;
}
