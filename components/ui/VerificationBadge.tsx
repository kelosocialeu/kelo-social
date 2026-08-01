"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
getVerificationBadge,
getVerificationIssuers,
getIssuerProfile,
} from "@/lib/atproto/verification";

interface VerificationBadgeProps {
actor: any;
size?: "small" | "medium" | "large";
showLabel?: boolean;
}

const KELO_ID_BADGE_IMAGE =
"https://kelosocial.sirv.com/Kelo-ID/kelo-id-badge.png";

const TRUSTED_VERIFIER_IMAGE =
"https://kelosocial.sirv.com/Kelo-ID/trusted-verifier.png";

export default function VerificationBadge({
actor,
size = "medium",
showLabel = true,
}: VerificationBadgeProps) {

const [verified, setVerified] = useState(false);
const [issuer, setIssuer] = useState<any>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
```
async function loadVerification() {
  try {
    if (!actor?.did) {
      setLoading(false);
      return;
    }
    const badge = await getVerificationBadge(actor.did);
    if (badge) {
      setVerified(true);
      const issuers = await getVerificationIssuers(
        actor.did
      );
      if (issuers?.length) {
        const profile =
          await getIssuerProfile(
            issuers[0]
          );
        setIssuer(profile);
      }
    }
  } catch (error) {
    console.error(
      "Erreur chargement vérification Kelo ID:",
      error
    );
  } finally {
    setLoading(false);
  }
}
loadVerification();
```
}, [actor]);
if (loading || !verified) {
return null;
}
const sizes = {
```
small: {
  image: 28,
  text: "text-xs",
  box: "px-2 py-1",
},
medium: {
  image: 38,
  text: "text-sm",
  box: "px-3 py-2",
},
large: {
  image: 52,
  text: "text-base",
  box: "px-4 py-3",
},
```
};
const current = sizes[size];
return (
```
<Link
  href="/kelo-id"
  className={`
    inline-flex
    items-center
    gap-2
    rounded-xl
    ${current.box}
    backdrop-blur-md
    border
    border-white/20
    bg-gradient-to-br
    from-[#00AEEF]
    via-[#7B5CFF]
    to-[#FF4FD8]
    shadow-lg
    hover:scale-105
    transition
  `}
>
  <div
    className="
      relative
      flex
      items-center
      justify-center
      rounded-lg
      bg-white/10
      overflow-hidden
    "
  >
    <Image
      src={KELO_ID_BADGE_IMAGE}
      alt="Kelo ID Verified"
      width={current.image}
      height={current.image}
      className="object-contain"
    />
  </div>
  {showLabel && (
    <div className="flex flex-col">
      <span
        className={`
          ${current.text}
          font-semibold
          text-white
        `}
      >
        Vérifié Kelo ID
      </span>
      {issuer && (
        <span
          className="
            text-[10px]
            text-white/80
          "
        >
          Certifié par {issuer.name}
        </span>
      )}
    </div>
  )}
  <Image
    src={TRUSTED_VERIFIER_IMAGE}
    alt="Trusted verifier"
    width={18}
    height={18}
  />
</Link>
```
);
}
