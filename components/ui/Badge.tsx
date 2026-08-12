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

// Images hébergées sur Sirv : rond dégradé pour "certifié",
// fleur à pétales dégradée pour "certificateur de confiance".
const IMAGES: Record<CertificationStatus, string> = {
  certified: "https://kelosocial.sirv.com/ChatGPT%20Image%2025%20juil.%202026%2C%2022_56_32.png",
  "trusted-verifier": "https://kelosocial.sirv.com/1784816368891-removebg-preview.png",
};

export default function Badge({ status, size = 18 }: BadgeProps) {
  // "none" signifie notamment qu'une certification existe peut-être encore
  // sur sa plateforme d'origine mais qu'elle est masquée localement par Kelo.
  if (status !== "certified" && status !== "trusted-verifier") {
    return null;
  }

  return (
    <img
      src={IMAGES[status]}
      alt={LABELS[status]}
      title={LABELS[status]}
      style={{ width: size, height: size }}
      className="inline-block flex-shrink-0 object-contain"
    />
  );
}
