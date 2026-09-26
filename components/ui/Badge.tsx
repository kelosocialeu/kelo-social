import type { CertificationStatus } from "@/lib/atproto/certifications";

type BadgeStatus = CertificationStatus | "none" | null | undefined;

interface BadgeProps {
  status: BadgeStatus;
  size?: number;
}

const LABELS: Record<CertificationStatus, string> = {
  certified: "Certifié",
  "trusted-verifier": "Certificateur de confiance",
};

// Le badge de certification est rendu directement en SVG pour éviter toute
// dépendance à une image distante. Le badge "certificateur de confiance"
// conserve son visuel existant.
const TRUSTED_VERIFIER_IMAGE =
  "https://kelosocial.sirv.com/1784816368891-removebg-preview.png";

function CertifiedBadge({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={LABELS.certified}
      title={LABELS.certified}
      className="inline-block flex-shrink-0"
    >
      <defs>
        <linearGradient
          id="kelo-certified-gradient"
          x1="12%"
          y1="8%"
          x2="88%"
          y2="92%"
        >
          <stop offset="0%" stopColor="#55B8FF" />
          <stop offset="52%" stopColor="#6578F5" />
          <stop offset="100%" stopColor="#B347FF" />
        </linearGradient>
      </defs>
      <circle
        cx="512"
        cy="512"
        r="374"
        fill="url(#kelo-certified-gradient)"
      />
      <path
        d="M320 540 L462 682 L715 405"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="74"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Badge({ status, size = 18 }: BadgeProps) {
  // "none" signifie notamment qu'une certification existe peut-être encore
  // sur sa plateforme d'origine mais qu'elle est masquée localement par Kelo.
  if (status !== "certified" && status !== "trusted-verifier") {
    return null;
  }

  if (status === "certified") {
    return <CertifiedBadge size={size} />;
  }

  return (
    <img
      src={TRUSTED_VERIFIER_IMAGE}
      alt={LABELS[status]}
      title={LABELS[status]}
      style={{ width: size, height: size }}
      className="inline-block flex-shrink-0 object-contain"
    />
  );
}
