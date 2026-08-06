"use client";

import Link from "next/link";
import {
  Heart,
  MessageCircle,
  PenSquare,
  Repeat2,
  ShieldCheck,
  X,
} from "lucide-react";

interface VerificationRequiredDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function VerificationRequiredDialog({
  open,
  onClose,
}: VerificationRequiredDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-required-title"
        className="relative w-full max-w-md rounded-3xl border border-kelo-border bg-white p-5 shadow-kelo sm:p-6"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-text"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kelo-gradient text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <h2
          id="verification-required-title"
          className="mt-4 text-xl font-extrabold text-kelo-text"
        >
          Vérification requise
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-kelo-muted">
          Pour protéger Kelo Social contre les faux comptes, cette fonctionnalité est réservée aux comptes vérifiés.
        </p>

        <div className="mt-5 rounded-2xl bg-kelo-background p-4">
          <p className="text-sm font-bold text-kelo-text">
            Vous pouvez déjà :
          </p>

          <div className="mt-3 grid gap-3 text-sm text-kelo-muted">
            <div className="flex items-center gap-3">
              <Heart className="h-4 w-4 text-kelo-secondary" />
              Aimer des publications
            </div>

            <div className="flex items-center gap-3">
              <Repeat2 className="h-4 w-4 text-kelo-success" />
              Republier des publications
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-kelo-border p-4">
          <p className="text-sm font-bold text-kelo-text">
            Après vérification :
          </p>

          <div className="mt-3 grid gap-3 text-sm text-kelo-muted">
            <div className="flex items-center gap-3">
              <PenSquare className="h-4 w-4 text-kelo-primary" />
              Publier du contenu
            </div>

            <div className="flex items-center gap-3">
              <MessageCircle className="h-4 w-4 text-kelo-primary" />
              Commenter et envoyer des messages
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-kelo-background px-5 py-3 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60"
          >
            Plus tard
          </button>

          <Link
            href="/verify-account"
            onClick={onClose}
            className="w-full rounded-full bg-kelo-gradient px-5 py-3 text-center text-sm font-bold text-white transition hover:opacity-90"
          >
            Vérifier mon compte
          </Link>
        </div>
      </div>
    </div>
  );
}
