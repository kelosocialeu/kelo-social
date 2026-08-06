import { AtpAgent } from "@atproto/api";

import {
  IDENTITY_VERIFICATION_COLLECTION,
  IdentityVerificationType,
} from "@/lib/atproto/identity-verifications";

interface BrowserSession {
  accessJwt: string;
  refreshJwt?: string;
  handle: string;
  did: string;
  pdsUrl: string;
}

const ALLOWED_VERIFICATION_TYPES: IdentityVerificationType[] = [
  "human",
  "enterprise",
  "media",
  "university",
  "association",
  "institution",
];

function normalizeVerificationType(
  value: unknown
): IdentityVerificationType {
  return ALLOWED_VERIFICATION_TYPES.includes(
    value as IdentityVerificationType
  )
    ? (value as IdentityVerificationType)
    : "human";
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variable ${name} manquante.`);
  }

  return value;
}

export function getKeloIdBaseUrl(): string {
  return requiredEnv("KELO_ID_URL").replace(/\/$/, "");
}

export function getKeloIdSecret(): string {
  return requiredEnv("KELO_SOCIAL_SHARED_SECRET");
}

export async function verifyBrowserSession(
  session: BrowserSession
): Promise<{
  did: string;
  handle: string;
}> {
  if (
    !session?.accessJwt ||
    !session?.did ||
    !session?.handle ||
    !session?.pdsUrl
  ) {
    throw new Error("Session Kelo Social invalide.");
  }

  const agent = new AtpAgent({
    service: session.pdsUrl,
  });

  await agent.resumeSession({
    accessJwt: session.accessJwt,
    refreshJwt: session.refreshJwt || "",
    handle: session.handle,
    did: session.did,
    active: true,
  });

  const response =
    await agent.api.com.atproto.server.getSession();

  return {
    did: response.data.did,
    handle: response.data.handle
      .trim()
      .replace(/^@/, "")
      .toLowerCase(),
  };
}

async function getAdminAgent(): Promise<{
  agent: AtpAgent;
  did: string;
  handle: string;
}> {
  const service = requiredEnv(
    "KELO_ADMIN_PDS_URL"
  );

  const identifier = requiredEnv(
    "KELO_ADMIN_ATPROTO_IDENTIFIER"
  );

  const password = requiredEnv(
    "KELO_ADMIN_ATPROTO_PASSWORD"
  );

  const agent = new AtpAgent({ service });

  const response = await agent.login({
    identifier,
    password,
  });

  return {
    agent,
    did: response.data.did,
    handle: response.data.handle
      .trim()
      .replace(/^@/, "")
      .toLowerCase(),
  };
}

export async function publishKeloIdVerification(input: {
  did: string;
  handle: string;
  verificationType?: IdentityVerificationType | string;
}): Promise<void> {
  const admin = await getAdminAgent();
  const verificationType = normalizeVerificationType(
    input.verificationType
  );

  await admin.agent.api.com.atproto.repo.putRecord({
    repo: admin.did,
    collection:
      IDENTITY_VERIFICATION_COLLECTION,
    rkey: input.did.toLowerCase(),
    record: {
      $type:
        IDENTITY_VERIFICATION_COLLECTION,
      subjectDid: input.did,
      subjectHandle: input.handle,
      verificationType,
      source: "kelo-id",
      assignmentMode: "automatic",
      issuedAt: new Date().toISOString(),
      issuerDid: admin.did,
      issuerHandle: admin.handle,
      schemaVersion: 1,
    },
    validate: false,
  });
}

export async function callKeloId(
  path: string,
  init: RequestInit
): Promise<Response> {
  return fetch(`${getKeloIdBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-kelo-secret": getKeloIdSecret(),
      ...(init.headers || {}),
    },
  });
}
