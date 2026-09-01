import { AtpAgent } from "@atproto/api";

export const CERTIFICATION_SUPPRESSION_COLLECTION =
  "eu.kelosocial.certification.suppression";

export const CERTIFICATION_POLICY_REPO_HANDLE =
  "kelosocial.eu";

export const CERTIFICATION_POLICY_PDS_URL =
  process.env.NEXT_PUBLIC_ADMIN_REPO_PDS_URL?.trim() ||
  "https://eurosky.social";

export interface CertificationSuppressionRecord {
  subjectDid: string;
  subjectHandle?: string;
  hiddenAt: string;
  hiddenByDid?: string;
  hiddenByHandle?: string;
  reason?: string;
}

interface CacheEntry {
  value: CertificationSuppressionRecord | null;
  expiresAt: number;
}

const CACHE_DURATION = 60 * 1000;
const cache = new Map<string, CacheEntry>();
let fullListLoadedAt = 0;
let fullListPromise: Promise<CertificationSuppressionRecord[]> | null = null;

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
}

function parseSuppression(value: unknown): CertificationSuppressionRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (
    typeof record.subjectDid !== "string" ||
    typeof record.hiddenAt !== "string"
  ) {
    return null;
  }

  return {
    subjectDid: record.subjectDid.trim(),
    subjectHandle:
      typeof record.subjectHandle === "string"
        ? record.subjectHandle.trim().replace(/^@/, "").toLowerCase()
        : undefined,
    hiddenAt: record.hiddenAt,
    hiddenByDid:
      typeof record.hiddenByDid === "string"
        ? record.hiddenByDid.trim()
        : undefined,
    hiddenByHandle:
      typeof record.hiddenByHandle === "string"
        ? record.hiddenByHandle.trim().replace(/^@/, "").toLowerCase()
        : undefined,
    reason:
      typeof record.reason === "string" && record.reason.trim()
        ? record.reason.trim()
        : undefined,
  };
}

function createPolicyAgent() {
  return new AtpAgent({ service: CERTIFICATION_POLICY_PDS_URL });
}

async function fetchFullSuppressionList(): Promise<CertificationSuppressionRecord[]> {
  const agent = createPolicyAgent();
  const records: CertificationSuppressionRecord[] = [];
  let cursor: string | undefined;

  try {
    do {
      const response = await agent.api.com.atproto.repo.listRecords({
        repo: CERTIFICATION_POLICY_REPO_HANDLE,
        collection: CERTIFICATION_SUPPRESSION_COLLECTION,
        limit: 100,
        cursor,
      });

      for (const item of response.data.records) {
        const parsed = parseSuppression(item.value);
        if (!parsed) continue;
        records.push(parsed);
        cache.set(normalizeDid(parsed.subjectDid), {
          value: parsed,
          expiresAt: Date.now() + CACHE_DURATION,
        });
      }

      cursor = response.data.cursor;
    } while (cursor);

    fullListLoadedAt = Date.now();
    return records;
  } catch {
    return [];
  }
}

export async function listCertificationSuppressions(): Promise<
  CertificationSuppressionRecord[]
> {
  if (fullListLoadedAt && Date.now() - fullListLoadedAt < CACHE_DURATION) {
    return Array.from(cache.values())
      .filter((entry) => entry.value)
      .map((entry) => entry.value!)
  }

  if (!fullListPromise) {
    fullListPromise = fetchFullSuppressionList().finally(() => {
      fullListPromise = null;
    });
  }

  return fullListPromise;
}

export async function getCertificationSuppression(
  subjectDid: string
): Promise<CertificationSuppressionRecord | null> {
  const did = normalizeDid(subjectDid);
  if (!did) return null;

  const cached = cache.get(did);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // A suppression is a sparse policy record. Querying getRecord for every DID
  // produces a 400 RecordNotFound for nearly every account and floods DevTools.
  // Load the small policy collection once, cache it, and treat absent DIDs as
  // not suppressed without issuing one failing XRPC request per account.
  await listCertificationSuppressions();

  const afterList = cache.get(did);
  if (afterList && afterList.expiresAt > Date.now()) {
    return afterList.value;
  }

  cache.set(did, {
    value: null,
    expiresAt: Date.now() + CACHE_DURATION,
  });
  return null;
}

export async function isCertificationSuppressed(subjectDid: string) {
  return Boolean(await getCertificationSuppression(subjectDid));
}

export function clearCertificationSuppressionCache(subjectDid?: string) {
  if (subjectDid) {
    cache.delete(normalizeDid(subjectDid));
    return;
  }
  cache.clear();
  fullListLoadedAt = 0;
  fullListPromise = null;
}
