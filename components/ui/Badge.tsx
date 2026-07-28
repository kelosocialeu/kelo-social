import type { CertificationStatus } from "@/lib/atproto/certifications";

interface BadgeProps {
  status: CertificationStatus;
}

const LABELS: Record<CertificationStatus, string> = {
  certified: "Certifié",
  "trusted-verifier": "Certificateur de confiance",
};

export default function Badge({ status }: BadgeProps) {
  const isVerifier = status === "trusted-verifier";
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
        isVerifier
          ? "border-kelo-secondary/30 bg-kelo-secondary/10 text-kelo-secondary"
          : "border-kelo-primary/30 bg-kelo-primary/10 text-kelo-primary"
      }`}
    >
      {LABELS[status]}
    </span>
  );
}
