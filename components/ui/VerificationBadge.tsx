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

function normalizeDid(value: string): string {
  return value.trim().toLowerCase();
}

export default function VerificationBadge({
  actor,
  size = 16,
}: VerificationBadgeProps) {
  const initialNativeBadge = getVerificationBadge(actor);

  const [nativeBadge, setNativeBadge] =
    useState<VerificationBadgeType>(initialNativeBadge);

  const [nativeActor, setNativeActor] = useState<any>(actor);

  const [keloCertifications, setKeloCertifications] =
    useState<CertificationRecord[]>([]);

  const [checking, setChecking] = useState(
    !initialNativeBadge || !!actor?.did
  );

  const [open, setOpen] = useState(false);

  const [issuers, setIssuers] =
    useState<IssuerProfile[]>([]);

  const [loadingIssuer, setLoadingIssuer] =
    useState(false);

  const [issuerError, setIssuerError] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBadgeSources() {
      const did =
        typeof actor?.did === "string"
          ? actor.did
          : "";

      try {
        const [publicVerification, allKeloRecords] =
          await Promise.all([
            getPublicNativeVerification(actor),
            did
              ? listCertifications()
              : Promise.resolve([] as CertificationRecord[]),
          ]);

        if (cancelled) return;

        if (publicVerification) {
          const enrichedActor = {
            ...actor,
            verification: publicVerification,
          };

          setNativeActor(enrichedActor);
          setNativeBadge(getVerificationBadge(enrichedActor));
        } else {
          setNativeActor(actor);
          setNativeBadge(getVerificationBadge(actor));
        }

        const normalizedSubjectDid = normalizeDid(did);
        const matchingRecords = allKeloRecords.filter(
          (record) =>
            normalizeDid(record.subjectDid) === normalizedSubjectDid
        );

        setKeloCertifications(matchingRecords);
      } catch (error) {
        console.error(
          "Impossible de déterminer le badge du compte :",
          error
        );
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    loadBadgeSources();

    return () => {
      cancelled = true;
    };
  }, [actor]);

  useEffect(() => {
    setIssuers([]);
    setIssuerError(false);
  }, [actor?.did]);

  const badgeType = useMemo<VerificationBadgeType>(() => {
    if (nativeBadge === "trusted-verifier") {
      return "trusted-verifier";
    }

    if (
      keloCertifications.some(
        (record) => record.status === "trusted-verifier"
      )
    ) {
      return "trusted-verifier";
    }

    if (nativeBadge === "verified") {
      return "verified";
    }

    if (
      keloCertifications.some(
        (record) => record.status === "certified"
      )
    ) {
      return "verified";
    }

    return null;
  }, [nativeBadge, keloCertifications]);

  if (checking && !badgeType) return null;
  if (!badgeType) return null;

  const handleClick = async (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setOpen(true);

    if (
      badgeType === "verified" &&
      issuers.length === 0 &&
      !loadingIssuer
    ) {
      setLoadingIssuer(true);
      setIssuerError(false);

      try {
        const nativeIssuers = getVerificationIssuers(nativeActor);

        const issuerEntries: Array<{
          did?: string;
          handle?: string;
          displayName?: string;
          source: "native" | "kelo";
        }> = nativeIssuers.map((item) => ({
          did: item.issuer,
          source: "native" as const,
        }));

        for (const certification of keloCertifications) {
          if (certification.status !== "certified") continue;

          issuerEntries.push({
            did: certification.issuerDid,
            handle:
              certification.issuerHandle ||
              (!certification.issuerDid
                ? "kelosocial.eu"
                : undefined),
            displayName:
              !certification.issuerDid
                ? "Kelo Social"
                : undefined,
            source: "kelo",
          });
        }

        const uniqueEntries = issuerEntries.filter(
          (entry, index, all) => {
            const key =
              entry.did?.toLowerCase() ||
              entry.handle?.toLowerCase();

            return (
              !!key &&
              all.findIndex((candidate) =>
                (candidate.did?.toLowerCase() ||
                  candidate.handle?.toLowerCase()) === key
              ) === index
            );
          }
        );

        const profiles = await Promise.all(
          uniqueEntries.map(async (entry) => {
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
              } catch (error) {
                console.error(
                  "Erreur récupération certificateur :",
                  error
                );
              }
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

        const validProfiles = profiles.filter(
          (profile): profile is IssuerProfile =>
            Boolean(profile?.handle)
        );

        setIssuers(validProfiles);
        setIssuerError(validProfiles.length === 0);
      } catch (error) {
        console.error(
          "Erreur récupération certificateurs :",
          error
        );
        setIssuerError(true);
      } finally {
        setLoadingIssuer(false);
      }
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="relative inline-flex cursor-pointer"
      >
        <Badge
          status={
            badgeType === "trusted-verifier"
              ? "trusted-verifier"
              : "certified"
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
                <p className="text-sm text-kelo-muted">
                  Chargement...
                </p>
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
                          fallback={
                            issuer.handle[0]?.toUpperCase() || "K"
                          }
                          size="sm"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-kelo-text">
                            {issuer.displayName || issuer.handle}
                          </p>

                          <p className="truncate text-xs text-kelo-muted">
                            @{issuer.handle}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {!loadingIssuer && issuerError && (
                <p className="text-sm text-kelo-muted">
                  Impossible de déterminer les certificateurs.
                </p>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full rounded-full bg-kelo-background py-2.5 text-sm font-bold text-kelo-text hover:bg-kelo-border/60"
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

                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={CERTIFIER_IMAGE}
                      alt="Certificateur de confiance"
                      className="h-14 w-14 object-contain"
                    />
                    <span className="text-center text-xs font-semibold text-kelo-muted">
                      Certificateur
                      <br />
                      de confiance
                    </span>
                  </div>

                  <ArrowRight className="h-4 w-4 text-kelo-muted" />

                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={VERIFIED_IMAGE}
                      alt="Compte certifié"
                      className="h-14 w-14 object-contain"
                    />
                    <span className="text-center text-xs font-semibold text-kelo-muted">
                      Compte
                      <br />
                      certifié
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="mb-2 text-center text-base font-extrabold text-kelo-text">
                {actor?.displayName || actor?.handle} est un certificateur de confiance
              </h3>

              <p className="mb-5 text-center text-sm text-kelo-muted">
                Ce compte peut certifier d’autres comptes.
              </p>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-full bg-kelo-background py-2.5 text-sm font-bold text-kelo-text hover:bg-kelo-border/60"
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
