"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import Badge from "@/components/ui/Badge";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/feed/Avatar";

import {
  getVerificationBadge,
  getVerificationIssuers,
  getIssuerProfile,
} from "@/lib/atproto/verification";

interface VerificationBadgeProps {
  actor: any;
}

interface IssuerProfile {
  handle: string;
  displayName?: string;
  avatar?: string;
}

const CERTIFIER_IMAGE =
  "https://kelosocial.sirv.com/Certificateur.png";

const VERIFIED_IMAGE =
  "https://kelosocial.sirv.com/Verified.png";

export default function VerificationBadge({
  actor,
}: VerificationBadgeProps) {
  const badgeType = getVerificationBadge(actor);

  const [open, setOpen] = useState(false);
  const [issuer, setIssuer] = useState<IssuerProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (!badgeType) return null;

  const handleClick = async (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setOpen(true);

    if (badgeType === "verified" && !issuer && !loading) {
      const issuers = getVerificationIssuers(actor);
      const issuerDid = issuers[0]?.issuer;

      if (!issuerDid) {
        setLoadError(true);
        return;
      }

      setLoading(true);

      try {
        const profile = await getIssuerProfile(issuerDid);
        setIssuer(profile);
      } catch (error) {
        console.error(
          "Erreur récupération certificateur :",
          error
        );
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div
        onClick={handleClick}
        className="inline-flex cursor-pointer"
      >
        <Badge
          status={
            badgeType === "trusted-verifier"
              ? "trusted-verifier"
              : "certified"
          }
        />
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />

          {badgeType === "verified" ? (
            <div
              className="absolute left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-kelo-border bg-white p-4 shadow-kelo"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-3 text-sm font-bold text-kelo-text">
                Compte certifié
              </p>

              {loading && (
                <p className="text-sm text-kelo-muted">
                  Chargement...
                </p>
              )}

              {!loading && issuer && (
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
                      fallback={issuer.handle[0].toUpperCase()}
                      size="sm"
                    />

                    <div>
                      <p className="text-sm font-bold text-kelo-text">
                        {issuer.displayName || issuer.handle}
                      </p>
                      <p className="text-xs text-kelo-muted">
                        @{issuer.handle}
                      </p>
                    </div>
                  </Link>
                </>
              )}

              {!loading && loadError && (
                <p className="text-sm text-kelo-muted">
                  Impossible de déterminer le certificateur.
                </p>
              )}
            </div>
          ) : (
            <div
              className="fixed left-1/2 top-1/2 z-40 w-96 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-kelo-border bg-white p-6 shadow-kelo"
              onClick={(e) => e.stopPropagation()}
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
                      alt="Compte vérifié"
                      className="h-14 w-14 object-contain"
                    />

                    <span className="text-center text-xs font-semibold text-kelo-muted">
                      Compte
                      <br />
                      vérifié
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="mb-2 text-center text-base font-extrabold text-kelo-text">
                {actor?.displayName || actor?.handle} est un certificateur de confiance
              </h3>

              <p className="mb-5 text-center text-sm text-kelo-muted">
                Les comptes avec ce badge peuvent certifier d'autres comptes.
                Les certificateurs de confiance sont sélectionnés par Kelo Social.
              </p>

              <button
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
