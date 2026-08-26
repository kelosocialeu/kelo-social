"use client";

import IdentityVerificationBadge from "@/components/ui/IdentityVerificationBadge";
import RobotAccountBadge from "@/components/ui/RobotAccountBadge";
import VerificationBadge from "@/components/ui/VerificationBadge";

interface AccountBadgesProps {
  actor: {
    did?: string;
    handle?: string;
    displayName?: string;
    verification?: unknown;
    labels?: unknown;
    [key: string]: unknown;
  };
  certificationSize?: number;
  identitySize?: "sm" | "md" | "lg";
  showIdentityLabel?: boolean;
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
  if (!actor) return null;

  const renderedCertificationSize = Math.max(certificationSize, 22);

  return (
    <span
      className={`inline-flex min-w-0 flex-shrink-0 items-center ${GAP_CLASSES[gap]} ${className}`}
      aria-label="Badges du compte"
    >
      <IdentityVerificationBadge
        actor={actor}
        size={identitySize}
        showLabel={showIdentityLabel}
      />

      <VerificationBadge
        actor={actor}
        size={renderedCertificationSize}
      />

      <RobotAccountBadge
        actor={actor}
        size={Math.max(16, Math.round(renderedCertificationSize * 0.78))}
      />
    </span>
  );
}
