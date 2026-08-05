"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  GraduationCap,
  HeartHandshake,
  Landmark,
  Newspaper,
  UserRound,
  X,
} from "lucide-react";

import {
  getIdentityVerification,
  IdentityVerificationRecord,
  IdentityVerificationType,
  IDENTITY_VERIFICATION_LABELS,
  IDENTITY_VERIFICATION_SOURCE_LABELS,
} from "@/lib/atproto/identity-verifications";

interface IdentityVerificationBadgeProps {
  actor: {
    did?: string;
    handle?: string;
    displayName?: string;
  };
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const TYPE_ICONS: Record<
  IdentityVerificationType,
  typeof UserRound
> = {
  human: UserRound,
  enterprise: Building2,
  media: Newspaper,
  university: GraduationCap,
  association: HeartHandshake,
  institution: Landmark,
};

const TYPE_STYLES: Record<
  IdentityVerificationType,
  {
    border: string;
    iconBackground: string;
    iconText: string;
    line: string;
    secondaryLine: string;
  }
> = {
  human: {
    border:
      "from-sky-500 via-fuchsia-500 to-pink-500",
    iconBackground:
      "from-sky-500 via-violet-500 to-fuchsia-500",
    iconText: "text-white",
    line:
      "from-sky-400 via-violet-400 to-fuchsia-400",
    secondaryLine:
      "from-fuchsia-300 via-pink-300 to-rose-300",
  },

  enterprise: {
    border:
      "from-cyan-400 via-teal-400 to-emerald-400",
    iconBackground:
      "from-cyan-500 via-teal-500 to-emerald-500",
    iconText: "text-white",
    line:
      "from-cyan-300 via-teal-300 to-emerald-300",
    secondaryLine:
      "from-teal-200 via-emerald-200 to-lime-200",
  },

  media: {
    border:
      "from-orange-400 via-pink-500 to-fuchsia-500",
    iconBackground:
      "from-orange-500 via-rose-500 to-fuchsia-500",
    iconText: "text-white",
    line:
      "from-orange-300 via-rose-300 to-fuchsia-300",
    secondaryLine:
      "from-amber-200 via-orange-200 to-rose-200",
  },

  university: {
    border:
      "from-emerald-400 via-teal-400 to-cyan-400",
    iconBackground:
      "from-emerald-500 via-teal-500 to-cyan-500",
    iconText: "text-white",
    line:
      "from-emerald-300 via-teal-300 to-cyan-300",
    secondaryLine:
      "from-lime-200 via-emerald-200 to-teal-200",
  },

  association: {
    border:
      "from-violet-400 via-purple-500 to-fuchsia-500",
    iconBackground:
      "from-violet-500 via-purple-500 to-fuchsia-500",
    iconText: "text-white",
    line:
      "from-violet-300 via-purple-300 to-fuchsia-300",
    secondaryLine:
      "from-purple-200 via-fuchsia-200 to-pink-200",
  },

  institution: {
    border:
      "from-blue-500 via-indigo-500 to-violet-500",
    iconBackground:
      "from-blue-600 via-indigo-600 to-violet-600",
    iconText: "text-white",
    line:
      "from-blue-300 via-indigo-300 to-violet-300",
    secondaryLine:
      "from-sky-200 via-blue-200 to-indigo-200",
  },
};

const SIZE_CLASSES = {
  sm: {
    container: "h-6 min-w-9 rounded-lg p-[1px]",
    inner: "gap-1 rounded-[7px] px-1.5",
    iconWrapper: "h-4 w-4 rounded-md",
    icon: "h-2.5 w-2.5",
    label: "text-[10px]",
  },

  md: {
    container: "h-8 min-w-12 rounded-xl p-[1px]",
    inner: "gap-1.5 rounded-[11px] px-2",
    iconWrapper: "h-5 w-5 rounded-md",
    icon: "h-3 w-3",
    label: "text-xs",
  },

  lg: {
    container: "h-10 min-w-16 rounded-2xl p-[1.5px]",
    inner: "gap-2 rounded-[14px] px-2.5",
    iconWrapper: "h-6 w-6 rounded-lg",
    icon: "h-3.5 w-3.5",
    label: "text-sm",
  },
};

export default function IdentityVerificationBadge({
  actor,
  size = "sm",
  showLabel = false,
}: IdentityVerificationBadgeProps) {
  const [record, setRecord] =
    useState<IdentityVerificationRecord | null>(null);

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadVerification() {
      if (!actor?.did) {
        setRecord(null);
        return;
      }

      setLoading(true);

      try {
        const verification =
          await getIdentityVerification(actor.did);

        if (!cancelled) {
          setRecord(verification);
        }
      } catch (error) {
        console.error(
          "Impossible de charger la vérification d’identité :",
          error
        );

        if (!cancelled) {
          setRecord(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadVerification();

    return () => {
      cancelled = true;
    };
  }, [actor?.did]);

  const label = useMemo(() => {
    if (!record) {
      return "";
    }

    return IDENTITY_VERIFICATION_LABELS[
      record.verificationType
    ];
  }, [record]);

  if (loading || !record) {
    return null;
  }

  const Icon = TYPE_ICONS[record.verificationType];
  const style = TYPE_STYLES[record.verificationType];
  const sizing = SIZE_CLASSES[size];

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={label}
        title={label}
        className={`inline-flex bg-gradient-to-r ${style.border} ${sizing.container} flex-shrink-0 transition hover:scale-[1.03] active:scale-95`}
      >
        <span
          className={`flex h-full w-full items-center bg-slate-950/95 ${sizing.inner}`}
        >
          <span
            className={`flex flex-shrink-0 items-center justify-center bg-gradient-to-br ${style.iconBackground} ${sizing.iconWrapper}`}
          >
            <Icon
              className={`${style.iconText} ${sizing.icon}`}
            />
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={`h-1 rounded-full bg-gradient-to-r ${style.line}`}
            />

            <span
              className={`h-1 w-2/3 rounded-full bg-gradient-to-r ${style.secondaryLine}`}
            />
          </span>

          {showLabel && (
            <span
              className={`ml-1 whitespace-nowrap font-bold text-white ${sizing.label}`}
            >
              {label}
            </span>
          )}
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="identity-verification-title"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-kelo-border bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${style.iconBackground}`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <div>
                  <h2
                    id="identity-verification-title"
                    className="text-base font-extrabold text-kelo-text"
                  >
                    {label}
                  </h2>

                  <p className="text-xs text-kelo-muted">
                    Vérification Kelo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-kelo-muted transition hover:bg-kelo-background hover:text-kelo-text"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-kelo-background p-4 text-center">
              <p className="text-sm font-semibold leading-relaxed text-kelo-text">
                {actor?.displayName ||
                  actor?.handle ||
                  "Ce compte"}{" "}
                a bien été vérifié sur{" "}
                {
                  IDENTITY_VERIFICATION_SOURCE_LABELS[
                    record.source
                  ]
                }
                .
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-full bg-kelo-gradient py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Fermer
            </button>
          </div>
        </>
      )}
    </>
  );
}
