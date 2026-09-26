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

function CertifiedBadge({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={LABELS.certified}
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
      <circle cx="256" cy="256" r="187" fill="url(#kelo-certified-gradient)" />
      <path
        d="M160 270 L231 341 L357 203"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="37"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrustedVerifierBadge({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={LABELS["trusted-verifier"]}
      className="inline-block flex-shrink-0"
    >
      <defs>
        <linearGradient
          id="kelo-trusted-verifier-gradient"
          x1="12%"
          y1="8%"
          x2="88%"
          y2="92%"
        >
          <stop offset="0%" stopColor="#48B8FF" />
          <stop offset="32%" stopColor="#5F92F7" />
          <stop offset="61%" stopColor="#746CF3" />
          <stop offset="82%" stopColor="#934DEB" />
          <stop offset="100%" stopColor="#B23BE6" />
        </linearGradient>
      </defs>
      <path d="M 211 70 L 196 79 L 173 103 L 166 108 L 146 116 L 124 117 L 106 121 L 90 130 L 77 143 L 67 162 L 64 178 L 65 195 L 68 207 L 67 229 L 59 248 L 47 264 L 42 274 L 38 288 L 39 313 L 45 329 L 55 343 L 65 352 L 88 365 L 102 379 L 109 391 L 115 413 L 121 425 L 137 443 L 146 449 L 166 456 L 181 457 L 198 454 L 221 444 L 231 442 L 244 442 L 257 445 L 271 452 L 284 456 L 309 456 L 330 448 L 339 442 L 347 434 L 353 426 L 359 414 L 363 397 L 373 378 L 389 363 L 412 350 L 425 336 L 432 323 L 436 309 L 436 288 L 434 279 L 428 265 L 415 248 L 407 228 L 406 211 L 410 191 L 409 168 L 405 156 L 395 140 L 387 132 L 375 124 L 362 119 L 334 117 L 316 112 L 299 101 L 281 81 L 273 75 L 261 69 L 244 65 L 230 65 Z" fill="url(#kelo-trusted-verifier-gradient)" />
      <path d="M 333 207 L 330 203 L 328 203 L 327 200 L 321 198 L 315 198 L 308 201 L 210 299 L 164 254 L 163 255 L 160 253 L 152 253 L 149 256 L 146 256 L 141 263 L 142 276 L 145 280 L 147 280 L 150 283 L 148 281 L 152 281 L 153 283 L 151 285 L 156 289 L 155 290 L 165 298 L 169 304 L 200 335 L 207 338 L 217 337 L 233 323 L 239 315 L 249 307 L 255 299 L 281 273 L 283 273 L 289 265 L 297 259 L 304 250 L 332 223 L 334 216 Z" fill="#FFFFFF" />
    </svg>
  );
}

export default function Badge({ status, size = 18 }: BadgeProps) {
  if (status !== "certified" && status !== "trusted-verifier") {
    return null;
  }

  if (status === "certified") {
    return <CertifiedBadge size={size} />;
  }

  return <TrustedVerifierBadge size={size} />;
}
