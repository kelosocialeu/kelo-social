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
  getKeloCertification,
} from "@/lib/atproto/certifications";

interface VerificationBadgeProps {
  actor: any;
  size?: number;
}

interface IssuerProfile {
  handle: string;
  displayName?: string;
  avatar?: string;
}

const CERTIFIER_IMAGE =
  "https://kelosocial.sirv.com/1784816368891-removebg-preview.png";

const VERIFIED_IMAGE =
  "https://kelosocial.sirv.com/ChatGPT%20Image%2025%20juil.%202026%2C%2022_56_32.png";

export default function VerificationBadge({
  actor,
  size = 16,
}: VerificationBadgeProps) {
  const initialNativeBadge =
    getVerificationBadge(actor);

  const [nativeBadge, setNativeBadge] =
    useState<VerificationBadgeType>(
      initialNativeBadge
    );

  const [nativeActor, setNativeActor] =
    useState<any>(actor);

  const [keloCertification, setKeloCertification] =
    useState<CertificationRecord | null>(null);

  const [checking, setChecking] = useState(
    !initialNativeBadge || !!actor?.did
  );

  const [open, setOpen] = useState(false);

  const [issuer, setIssuer] =
    useState<IssuerProfile | null>(null);

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
        const tasks: Promise<any>[] = [];

        /*
         * On relit toujours le profil public lorsque l’objet actor peut venir
         * d’un PDS tiers. Cela permet de détecter correctement les
         * certificateurs de confiance Bluesky.
         */
        tasks.push(
          getPublicNativeVerification(actor)
        );

        tasks.push(
          did
            ? getKeloCertification(did)
            : Promise.resolve(null)
        );

        const [
          publicVerification,
          keloRecord,
        ] = await Promise.all(tasks);

        if (cancelled) {
          return;
        }

        if (publicVerification) {
          const enrichedActor = {
            ...actor,
            verification: publicVerification,
          };

          setNativeActor(enrichedActor);
          setNativeBadge(
            getVerificationBadge(enrichedActor)
          );
        } else {
          setNativeActor(actor);
          setNativeBadge(
            getVerificationBadge(actor)
          );
        }

        setKeloCertification(keloRecord);
      } catch (error) {
        console.error(
          "Impossible de déterminer le badge du compte :",
          error
        );
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    }

    loadBadgeSources();

    return () => {
      cancelled = true;
    };
  }, [actor]);

  /**
   * Priorité finale :
   * 1. Certificateur natif Bluesky
   * 2. Certificateur Kelo
   * 3. Certification native Bluesky
   * 4. Certification Kelo
   */
  const badgeType = useMemo<
    VerificationBadgeType
  >(() => {
    if (nativeBadge === "trusted-verifier") {
      return "trusted-verifier";
    }

    if (
      keloCertification?.status ===
      "trusted-verifier"
    ) {
      return "trusted-verifier";
    }

    if (nativeBadge === "verified") {
      return "verified";
    }

    if (
      keloCertification?.status === "certified"
    ) {
      return "verified";
    }

    return null;
  }, [nativeBadge, keloCertification]);

  if (checking && !badgeType) {
    return null;
  }

  if (!badgeType) {
    return null;
  }

  const handleClick = async (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setOpen(true);

    if (
      badgeType === "verified" &&
      !issuer &&
      !loadingIssuer
    ) {
      const nativeIssuers =
        getVerificationIssuers(nativeActor);

      const nativeIssuerDid =
        nativeIssuers[0]?.issuer;

      const keloIssuerDid =
        keloCertification?.issuerDid;

      const issuerDid =
        nativeIssuerDid || keloIssuerDid;

      if (!issuerDid) {
        /*
         * Anciennes certifications Kelo sans issuerDid :
         * on affiche directement @kelosocial.eu.
         */
        if (keloCertification) {
          setIssuer({
            handle:
              keloCertification.issuerHandle ||
              "kelosocial.eu",
            displayName: "Kelo Social",
          });
          return;
        }

        setIssuerError(true);
        return;
      }

      setLoadingIssuer(true);

      try {
        const profile =
          await getIssuerProfile(issuerDid);

        setIssuer(profile);
      } catch (error) {
        console.error(
          "Erreur récupération certificateur :",
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
              className="fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-kelo-border bg-white p-5 shadow-kelo"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <p className="mb-3 text-sm font-bold text-kelo-text">
                Compte certifié
              </p>

              {loadingIssuer && (
                <p className="text-sm text-kelo-muted">
                  Chargement...
                </p>
              )}

              {!loadingIssuer && issuer && (
                <>
                  <p className="mb-2 text-xs text-kelo-muted">
                    Certifié par :
                  </p>

                  <Link
                    href={`/profile/${issuer.handle}`}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-kelo-background"
                    onClick={() => setOpen(false)}
                  >
                    <Avatar
                      src={issuer.avatar}
                      fallback={
                        issuer.handle[0]?.toUpperCase() ||
                        "K"
                      }
                      size="sm"
                    />

                    <div>
                      <p className="text-sm font-bold text-kelo-text">
                        {issuer.displayName ||
                          issuer.handle}
                      </p>

                      <p className="text-xs text-kelo-muted">
                        @{issuer.handle}
                      </p>
                    </div>
                  </Link>

                  {keloCertification?.issuedAt && (
                    <p className="mt-3 text-xs text-kelo-muted">
                      Attribuée le{" "}
                      {new Date(
                        keloCertification.issuedAt
                      ).toLocaleDateString("fr-BE")}
                    </p>
                  )}
                </>
              )}

              {!loadingIssuer && issuerError && (
                <p className="text-sm text-kelo-muted">
                  Impossible de déterminer le certificateur.
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
              onClick={(event) =>
                event.stopPropagation()
              }
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
                {actor?.displayName || actor?.handle} est
                un certificateur de confiance
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
