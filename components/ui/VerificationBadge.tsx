"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/feed/Avatar";
import { getVerificationBadge, getVerificationIssuers, getIssuerProfile } from "@/lib/atproto/verification";

interface VerificationBadgeProps {
  actor: any;
}

/**
 * Affiche le badge de vérification réseau d'un compte (rond = vérifié,
 * fleur = certificateur de confiance). Cliquer sur le rond ouvre une
 * fenêtre indiquant par qui le compte a été certifié.
 */
export default function VerificationBadge({ actor }: VerificationBadgeProps) {
  const badgeType = getVerificationBadge(actor);
  const [open, setOpen] = useState(false);
  const [issuer, setIssuer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (!badgeType) return null;

  if (badgeType === "trusted-verifier") {
    return <Badge status="trusted-verifier" />;
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    if (!issuer && !loading) {
      const issuers = getVerificationIssuers(actor);
      const firstIssuerDid = issuers[0]?.did;
      if (!firstIssuerDid) {
        setLoadError(true);
        return;
      }
      setLoading(true);
      try {
        const profile = await getIssuerProfile(firstIssuerDid);
        setIssuer(profile);
      } catch (err) {
        console.error(err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <span className="relative inline-flex">
      <button onClick={handleClick} className="inline-flex" title="Compte certifié">
        <Badge status="certified" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            className="absolute left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-kelo-border bg-white p-4 shadow-kelo"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-bold text-kelo-text">Compte certifié</p>

            {loading && <p className="text-sm text-kelo-muted">Chargement...</p>}

            {!loading && issuer && (
              <>
                <p className="mb-2 text-xs text-kelo-muted">Ce compte a été certifié par :</p>
                <Link
                  href={`/profile/${issuer.handle}`}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-kelo-background"
                  onClick={() => setOpen(false)}
                >
                  <Avatar src={issuer.avatar} fallback={issuer.handle[0].toUpperCase()} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-kelo-text">
                      {issuer.displayName || issuer.handle}
                    </p>
                    <p className="truncate text-xs text-kelo-muted">@{issuer.handle}</p>
                  </div>
                </Link>
              </>
            )}

            {!loading && loadError && (
              <p className="text-sm text-kelo-muted">Impossible de déterminer le certificateur.</p>
            )}
          </div>
        </>
      )}
    </span>
  );
}
