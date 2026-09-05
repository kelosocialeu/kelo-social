import type { AtpSession } from "@/types/auth";

const KELO_ID_SYNC_URL =
  process.env.NEXT_PUBLIC_KELO_ID_SYNC_URL ||
  "https://fbtloeehynqobbwcndru.supabase.co/functions/v1/kelo-id-atproto-sync";

export interface KeloIdStatusSync {
  verified: boolean;
  shouldVerify: boolean;
  verificationStatus: string;
  verificationType: string;
  verifiedAt?: string | null;
  keloSocialLinkedAt?: string | null;
}

export async function syncKeloIdStatus(session: AtpSession): Promise<KeloIdStatusSync> {
  const response = await fetch(KELO_ID_SYNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      action: "sync",
      pdsUrl: session.pdsUrl,
      accessJwt: session.accessJwt,
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Synchronisation Kelo ID indisponible.");
  }

  return {
    verified: data?.verified === true,
    shouldVerify: data?.shouldVerify !== false,
    verificationStatus: String(data?.verificationStatus || "unverified"),
    verificationType: String(data?.verificationType || "human"),
    verifiedAt: typeof data?.verifiedAt === "string" ? data.verifiedAt : null,
    keloSocialLinkedAt:
      typeof data?.keloSocialLinkedAt === "string" ? data.keloSocialLinkedAt : null,
  };
}
