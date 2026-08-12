"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import Badge from "@/components/ui/Badge";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/feed/Avatar";
import {
  getVerificationBadge,
  getVerificationIssuers,
  getIssuerProfile,
  getPublicNativeVerification,
  VerificationBadgeType,
} from "@/lib/atproto/verification";
import {
  CertificationRecord,
  listCertifications,
} from "@/lib/atproto/certifications";
import { isCertificationSuppressed } from "@/lib/atproto/certification-suppressions";

interface VerificationBadgeProps {
  actor: any;
  size?: number;
}

interface IssuerProfile {
  did?: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  source?: "native" | "kelo";
}

const CERTIFIER_IMAGE =
  "https://kelosocial.sirv.com/1784816368891-removebg-preview.png";
const VERIFIED_IMAGE =
  "https://kelosocial.sirv.com/ChatGPT%20Image%2025%20juil.%202026%2C%2022_56_32.png";

const badgeCache = new Map<
  string,
  {
    nativeActor: any;
    nativeBadge: VerificationBadgeType;
    kelo: CertificationRecord[];
  }
>();

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
}

export default function VerificationBadge({
  actor,
  size = 16,
}: VerificationBadgeProps) {
  const did = typeof actor?.did === "string" ? actor.did : "";
  const cacheKey = normalizeDid(did);
  const cached = cacheKey ? badgeCache.get(cacheKey) : undefined;
  const initialNativeBadge = getVerificationBadge(actor);

  const [nativeBadge, setNativeBadge] = useState<VerificationBadgeType>(
    cached?.nativeBadge ?? initialNativeBadge
  );
  const [nativeActor, setNativeActor] = useState<any>(
    cached?.nativeActor ?? actor
  );
  const [keloCertifications, setKeloCertifications] = useState<
    CertificationRecord[]
  >(cached?.kelo ?? []);
  const [suppressed, setSuppressed] = useState<boolean | null>(
    did ? null : false
  );
  const [checking, setChecking] = useState(Boolean(did));
  const [open, setOpen] = useState(false);
  const [issuers, setIssuers] = useState<IssuerProfile[]>([]);
  const [loadingIssuer, setLoadingIssuer] = useState(false);
  const [issuerError, setIssuerError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [publicVerification, allKeloRecords, localSuppression] =
          await Promise.all([
            getPublicNativeVerification(actor),
            did
              ? listCertifications()
              : Promise.resolve([] as CertificationRecord[]),
            did ? isCertificationSuppressed(did) : Promise.resolve(false),
          ]);

        if (cancelled) return;

        const enriched = publicVerification
          ? { ...actor, verification: publicVerification }
          : actor;
        const nextNative = getVerificationBadge(enriched);
        const matching = allKeloRecords.filter(
          (record) => normalizeDid(record.subjectDid) === normalizeDid(did)
        );

        setNativeActor(enriched);
        setNativeBadge(nextNative);
        setKeloCertifications(matching);
        setSuppressed(localSuppression);

        if (cacheKey) {
          badgeCache.set(cacheKey, {
            nativeActor: enriched,
            nativeBadge: nextNative,
            kelo: matching,
          });
        }
      } catch (error) {
        console.warn(
          "Certification temporairement indisponible, conservation du dernier état connu.",
          error
        );
        if (!cancelled) setSuppressed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [actor, did, cacheKey]);

  useEffect(() => {
    setIssuers([]);
    setIssuerError(false);
  }, [did]);

  const badgeType = useMemo<VerificationBadgeType>(() => {
    if (suppressed) return null;

    if (
      nativeBadge === "trusted-verifier" ||
      keloCertifications.some((record) => record.status === "trusted-verifier")
    ) {
      return "trusted-verifier";
    }

    if (
      nativeBadge === "verified" ||
      keloCertifications.some((record) => record.status === "certified")
    ) {
      return "verified";
    }

    return null;
  }, [nativeBadge, keloCertifications, suppressed]);

  // Tant que la politique locale Kelo n'est pas connue, on n'affiche pas le
  // badge. Cela évite qu'une certification masquée clignote brièvement.
  if (checking || suppressed === null || !badgeType) return null;

  const handleClick = async (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);

    if (badgeType !== "verified" || issuers.length || loadingIssuer) return;

    setLoadingIssuer(true);
    setIssuerError(false);

    try {
      const entries: Array<{
        did?: string;
        handle?: string;
        displayName?: string;
        source: "native" | "kelo";
      }> = getVerificationIssuers(nativeActor).map((issuer) => ({
        did: issuer.issuer,
        source: "native",
      }));

      for (const certification of keloCertifications) {
        if (certification.status !== "certified") continue;
        entries.push({
          did: certification.issuerDid,
          handle:
            certification.issuerHandle ||
            (!certification.issuerDid ? "kelosocial.eu" : undefined),
          displayName: !certification.issuerDid ? "Kelo Social" : undefined,
          source: "kelo",
        });
      }

      const unique = entries.filter((entry, index, all) => {
        const key = entry.did?.toLowerCase() || entry.handle?.toLowerCase();
        return (
          !!key &&
          all.findIndex(
            (candidate) =>
              (candidate.did?.toLowerCase() || candidate.handle?.toLowerCase()) ===
              key
          ) === index
        );
      });

      const profiles = await Promise.all(
        unique.map(async (entry) => {
          if (entry.did) {
            try {
              const profile = await getIssuerProfile(entry.did);
              return {
                did: entry.did,
                handle: profile.handle,
                displayName: profile.displayName,
                avatar: profile.avatar,
                source: entry.source,
              } as IssuerProfile;
            } catch {}
          }

          if (entry.handle) {
            return {
              handle: entry.handle,
              displayName: entry.displayName,
              source: entry.source,
            } as IssuerProfile;
          }

          return null;
        })
      );

      const valid = profiles.filter(
        (profile): profile is IssuerProfile => Boolean(profile?.handle)
      );
      setIssuers(valid);
      setIssuerError(valid.length === 0);
    } catch {
      setIssuerError(true);
    } finally {
      setLoadingIssuer(false);
    }
  };

  return (
    <>
      <div onClick={handleClick} className="relative inline-flex cursor-pointer">
        <Badge
          status={
            badgeType === "trusted-verifier" ? "trusted-verifier" : "certified"
          }
          size={size}
        />
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/10"
            onClick={() => setOpen(false)}
          />

          {badgeType === "verified" ? (
            <div
              className="fixed left-1/2 top-1/2 z-40 max-h-[80vh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-kelo-border bg-white p-5 shadow-kelo"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="mb-3 text-sm font-bold text-kelo-text">
                Compte certifié
              </p>

              {loadingIssuer && (
                <p className="text-sm text-kelo-muted">Chargement...</p>
              )}

              {!loadingIssuer && issuers.length > 0 && (
                <>
                  <p className="mb-2 text-xs text-kelo-muted">
                    {issuers.length > 1
                      ? `Certifié par ${issuers.length} certificateurs de confiance :`
                      : "Certifié par :"}
                  </p>
                  <div className="space-y-1">
                    {issuers.map((issuer) => (
                      <Link
                        key={issuer.did || issuer.handle}
                        href={`/profile/${issuer.handle}`}
                        className="flex items-center gap-3 rounded-xl p-2 hover:bg-kelo-background"
                        onClick={() => setOpen(false)}
                      >
                        <Avatar
                          src={issuer.avatar}
                          fallback={issuer.handle[0]?.toUpperCase() || "K"}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-kelo-text">
                            {issuer.displayName || issuer.handle}
                          </p>
                          <p className="truncate text-xs text-kelo-muted">
                            @{issuer.handle}
                            {issuer.source === "kelo" ? " · Kelo" : " · AT Protocol"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {!loadingIssuer && issuerError && (
                <p className="text-sm text-kelo-muted">
                  Les détails des certificateurs sont temporairement indisponibles.
                  La certification reste active.
                </p>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full rounded-full bg-kelo-background py-2.5 text-sm font-bold text-kelo-text"
              >
                Fermer
              </button>
            </div>
          ) : (
            <div
              className="fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-kelo-border bg-white p-6 shadow-kelo"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 rounded-2xl bg-kelo-background p-5">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kelo-gradient">
                      <Logo className="h-8 w-8" />
                    </div>
                    <span className="text-xs font-semibold text-kelo-muted">
                      Kelo
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-kelo-muted" />
                  <img
                    src={CERTIFIER_IMAGE}
                    alt="Certificateur de confiance"
                    className="h-14 w-14 object-contain"
                  />
                  <ArrowRight className="h-4 w-4 text-kelo-muted" />
                  <img
                    src={VERIFIED_IMAGE}
                    alt="Compte certifié"
                    className="h-14 w-14 object-contain"
                  />
                </div>
              </div>

              <h3 className="mb-2 text-center text-base font-extrabold text-kelo-text">
                {actor?.displayName || actor?.handle} est un certificateur de confiance
              </h3>
              <p className="mb-5 text-center text-sm text-kelo-muted">
                Ce statut peut provenir de Kelo Social ou d’un service AT Protocol
                synchronisé.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-full bg-kelo-background py-2.5 text-sm font-bold text-kelo-text"
              >
                Fermer
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
