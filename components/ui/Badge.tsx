import type { CertificationStatus } from "@/lib/atproto/certifications";

interface BadgeProps {
  status: CertificationStatus;
  size?: number;
}

const LABELS: Record<CertificationStatus, string> = {
  certified: "Certifié",
  "trusted-verifier": "Certificateur de confiance",
};

// Position des 7 pétales du badge "Certificateur de confiance",
// répartis à intervalles réguliers autour du centre (50,50).
const PETALS = [
  { cx: 50, cy: 22 },
  { cx: 71.9, cy: 32.5 },
  { cx: 77.3, cy: 56.2 },
  { cx: 62.2, cy: 75.2 },
  { cx: 37.9, cy: 75.2 },
  { cx: 22.7, cy: 56.2 },
  { cx: 28.1, cy: 32.5 },
];

/**
 * Badge de certification. Deux formes distinctes :
 * - "trusted-verifier" : silhouette en fleur (7 pétales) — peut certifier
 *   d'autres comptes depuis le panneau Admin.
 * - "certified" : simple rond — certifié, sans droit de certifier.
 */
export default function Badge({ status, size = 18 }: BadgeProps) {
  const gradientId = `kelo-badge-gradient-${status}`;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={LABELS[status]}>
      <title>{LABELS[status]}</title>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7d4cff" />
          <stop offset="100%" stopColor="#d54cff" />
        </linearGradient>
      </defs>

      {status === "trusted-verifier" ? (
        <g fill={`url(#${gradientId})`}>
          {PETALS.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={25} />
          ))}
          <circle cx={50} cy={50} r={30} />
          {/* Petite étincelle qui distingue le badge "fleur" */}
          <path d="M85 78 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3 z" fill="white" opacity={0.85} />
        </g>
      ) : (
        <circle cx={50} cy={50} r={38} fill={`url(#${gradientId})`} />
      )}

      <path
        d="M30 52 L44 66 L72 34"
        fill="none"
        stroke="white"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
