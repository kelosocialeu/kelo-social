"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/feed/Avatar";
import { getVerificationBadge, getVerificationIssuers, getIssuerProfile } from "@/lib/atproto/verification";

interface VerificationBadgeProps {
actor: any;
}

const TRUSTED\_VERIFIER\_IMAGE = "[https://kelosocial.sirv.com/Trusted%20Verifier.png](https://kelosocial.sirv.com/Trusted%20Verifier.png)";

/\*\*

- Affiche le badge de vérification réseau d'un compte (rond = vérifié,
- fleur = certificateur de confiance).
-
  - Rond : ouvre une fenêtre indiquant par qui le compte a été certifié.
-
  - Fleur : ouvre une fenêtre expliquant ce qu'est un certificateur de
- confiance.
  \*/
  export default function VerificationBadge({ actor }: VerificationBadgeProps) {
  const badgeType = getVerificationBadge(actor);
  const [open, setOpen] = useState(false);
  const [issuer, setIssuer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

if (!badgeType) return null;

const handleClick = async (e: React.MouseEvent) => {
e.preventDefault();
e.stopPropagation();
setOpen(true);

```
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
  } catch (err) {
    console.error(err);
    setLoadError(true);
  } finally {
    setLoading(false);
  }
}
```

};

const close = () => setOpen(false);

return (


\<Badge status={badgeType === "trusted-verifier" ? "trusted-verifier" : "certified"} />


```
  {open && (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
      />

      {badgeType === "verified" ? (
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
                onClick={close}
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
      ) : (
        <div
          className="fixed left-1/2 top-1/2 z-40 w-96 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-kelo-border bg-white p-6 shadow-kelo"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-center">
            <img src={TRUSTED_VERIFIER_IMAGE} alt="Certificateur de confiance" className="h-48 w-48 object-contain" />
          </div>

          <h3 className="mb-2 text-center text-base font-extrabold text-kelo-text">
            {actor?.displayName || actor?.handle} est un certificateur de confiance
          </h3>
          <p className="mb-4 text-center text-sm text-kelo-muted">
            Les comptes certificateurs de confiance peuvent certifier d'autres comptes sur le réseau AT
            Protocol. Un compte certifié par un certificateur de confiance affiche le badge rond.
          </p>

          <button
            onClick={close}
            className="w-full rounded-full bg-kelo-background py-2.5 text-sm font-bold text-kelo-text transition hover:bg-kelo-border/60"
          >
            Fermer
          </button>
        </div>
      )}
    </>
  )}
</span>
```

);
}
