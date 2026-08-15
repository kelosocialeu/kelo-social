"use client";

import IdentityVerificationBadge from "@/components/ui/IdentityVerificationBadge";
import VerificationBadge from "@/components/ui/VerificationBadge";

interface AccountBadgesProps {
  actor: {
    did?: string;
    handle?: string;
    displayName?: string;
    verification?: unknown;
    [key: string]: unknown;
  };

  /**
   * Taille du badge de certification.
   */
  certificationSize?: number;

  /**
   * Taille du badge de vérification d'identité.
   */
  identitySize?: "sm" | "md" | "lg";

  /**
   * Affiche le texte du type de vérification à côté du badge.
   * À utiliser surtout sur les profils ou dans l'administration.
   */
  showIdentityLabel?: boolean;

  /**
   * Espace entre les badges.
   */
  gap?: "xs" | "sm" | "md";

  className?: string;
}

const GAP_CLASSES = {
  xs: "gap-1",
  sm: "gap-1.5",
  md: "gap-2",
};

export default function AccountBadges({
  actor,
  certificationSize = 22,
  identitySize = "sm",
  showIdentityLabel = false,
  gap = "xs",
  className = "",
}: AccountBadgesProps) {
  if (!actor) {
    return null;
  }

  // Les certifications doivent rester bien lisibles dans les surfaces
  // compactes (posts, messagerie, notifications). Les vues qui demandent
  // déjà une taille plus grande, comme les profils, conservent leur valeur.
  const renderedCertificationSize = Math.max(certificationSize, 22);

  return (
    <span
      className={`inline-flex min-w-0 flex-shrink-0 items-center ${GAP_CLASSES[gap]} ${className}`}
      aria-label="Badges du compte"
    >
      {/*
       * Vérification d'identité :
       * Kelo ID ou Kelo Verify.
       *
       * Le badge prend la forme d'une carte néon et reste distinct
       * des certifications rondes ou en forme de fleur.
       */}
      <IdentityVerificationBadge
        actor={actor}
        size={identitySize}
        showLabel={showIdentityLabel}
      />

      {/*
       * Certification :
       * certification native Bluesky/Kelo ou certificateur de confiance.
       *
       * VerificationBadge gère déjà la priorité :
       * certificateur de confiance > compte certifié.
       */}
      <VerificationBadge
        actor={actor}
        size={renderedCertificationSize}
      />
    </span>
  );
}
