import { getAuthenticatedAgent } from "@/services/auth.service";

const MODERATION_LABELER_DID =
  process.env.NEXT_PUBLIC_MODERATION_LABELER_DID?.trim() ||
  "did:plc:ar7c4by46qjdydhdevvrndac";

const BLOCK_CACHE_KEY = "kelo-blocked-accounts";
let blockedAccounts = new Map<string, string>();
let blockedAccountsLoaded = false;
let blockedAccountsLoading: Promise<void> | null = null;

function normalizeDid(did: string) {
  return did.trim().toLowerCase();
}

function persistBlockedAccounts() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BLOCK_CACHE_KEY, JSON.stringify([...blockedAccounts.entries()]));
  } catch {}
}

function restoreBlockedAccounts() {
  if (typeof window === "undefined" || blockedAccountsLoaded) return;
  blockedAccountsLoaded = true;
  try {
    const raw = localStorage.getItem(BLOCK_CACHE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw);
    if (Array.isArray(entries)) {
      blockedAccounts = new Map(entries.filter((entry) => Array.isArray(entry) && typeof entry[0] === "string"));
    }
  } catch {}
}

async function getModAgent() {
  const { agent, session } = await getAuthenticatedAgent();
  return { agent, myDid: session.did };
}

async function getReportingAgent() {
  const { agent } = await getModAgent();
  return agent.withProxy("atproto_labeler", MODERATION_LABELER_DID);
}

function getRkeyFromUri(uri: string, label: string): string {
  if (!uri?.startsWith("at://")) throw new Error(`${label} : URI AT Protocol invalide.`);
  const rkey = uri.split("/").pop();
  if (!rkey) throw new Error(`${label} : clé de record introuvable.`);
  return rkey;
}

function validateDid(did: string): void {
  if (!did?.startsWith("did:")) throw new Error("DID du compte invalide.");
}

export async function syncBlockedAccounts(force = false): Promise<void> {
  restoreBlockedAccounts();
  if (blockedAccountsLoading && !force) return blockedAccountsLoading;
  blockedAccountsLoading = (async () => {
    const { agent } = await getModAgent();
    const next = new Map<string, string>();
    let cursor: string | undefined;
    do {
      const response = await agent.api.app.bsky.graph.getBlocks({ limit: 100, cursor });
      for (const actor of response.data.blocks || []) {
        const did = normalizeDid(actor.did || "");
        const blockUri = actor.viewer?.blocking;
        if (did) next.set(did, typeof blockUri === "string" ? blockUri : "");
      }
      cursor = response.data.cursor;
    } while (cursor);
    blockedAccounts = next;
    blockedAccountsLoaded = true;
    persistBlockedAccounts();
  })().finally(() => {
    blockedAccountsLoading = null;
  });
  return blockedAccountsLoading;
}

export function isActorBlockedCached(did?: string | null): boolean {
  restoreBlockedAccounts();
  return !!did && blockedAccounts.has(normalizeDid(did));
}

export function getBlockedDidSet(): Set<string> {
  restoreBlockedAccounts();
  return new Set(blockedAccounts.keys());
}

export async function isActorBlocked(did: string): Promise<boolean> {
  validateDid(did);
  restoreBlockedAccounts();
  if (blockedAccounts.has(normalizeDid(did))) return true;
  try { await syncBlockedAccounts(); } catch {}
  return blockedAccounts.has(normalizeDid(did));
}

export async function blockActor(did: string): Promise<void> {
  validateDid(did);
  if (await isActorBlocked(did)) return;
  const { agent, myDid } = await getModAgent();
  const created = await agent.api.app.bsky.graph.block.create(
    { repo: myDid },
    { subject: did, createdAt: new Date().toISOString() }
  );
  blockedAccounts.set(normalizeDid(did), created.uri || "");
  blockedAccountsLoaded = true;
  persistBlockedAccounts();
}

export async function unblockActor(blockUri: string): Promise<void> {
  const { agent, myDid } = await getModAgent();
  const rkey = getRkeyFromUri(blockUri, "Blocage");
  await agent.api.app.bsky.graph.block.delete({ repo: myDid, rkey });
  for (const [did, uri] of blockedAccounts.entries()) {
    if (uri === blockUri) blockedAccounts.delete(did);
  }
  persistBlockedAccounts();
}

export async function unblockActorByDid(did: string): Promise<void> {
  validateDid(did);
  restoreBlockedAccounts();
  let uri = blockedAccounts.get(normalizeDid(did));
  if (!uri) {
    await syncBlockedAccounts(true);
    uri = blockedAccounts.get(normalizeDid(did));
  }
  if (!uri) return;
  await unblockActor(uri);
  blockedAccounts.delete(normalizeDid(did));
  persistBlockedAccounts();
}

export async function muteActor(did: string): Promise<void> {
  validateDid(did);
  const { agent } = await getModAgent();
  await agent.api.app.bsky.graph.muteActor({ actor: did }, { encoding: "application/json" });
}

export async function unmuteActor(did: string): Promise<void> {
  validateDid(did);
  const { agent } = await getModAgent();
  await agent.api.app.bsky.graph.unmuteActor({ actor: did }, { encoding: "application/json" });
}

export async function listMutedAccounts(limit = 50, cursor?: string) {
  const { agent } = await getModAgent();
  const response = await agent.api.app.bsky.graph.getMutes({ limit, cursor });
  return { items: response.data.mutes, cursor: response.data.cursor };
}

export async function listBlockedAccounts(limit = 50, cursor?: string) {
  const { agent } = await getModAgent();
  const response = await agent.api.app.bsky.graph.getBlocks({ limit, cursor });
  for (const actor of response.data.blocks || []) {
    if (actor.did) blockedAccounts.set(normalizeDid(actor.did), actor.viewer?.blocking || "");
  }
  blockedAccountsLoaded = true;
  persistBlockedAccounts();
  return { items: response.data.blocks, cursor: response.data.cursor };
}

export type ReportReason =
  | "com.atproto.moderation.defs#reasonSpam"
  | "com.atproto.moderation.defs#reasonViolation"
  | "com.atproto.moderation.defs#reasonMisleading"
  | "com.atproto.moderation.defs#reasonSexual"
  | "com.atproto.moderation.defs#reasonRude"
  | "com.atproto.moderation.defs#reasonOther";

function cleanReportDescription(description?: string): string | undefined {
  const cleaned = description?.trim().slice(0, 2000);
  return cleaned || undefined;
}

export async function reportPost(uri: string, cid: string, reasonType: ReportReason, description?: string): Promise<void> {
  if (!uri?.startsWith("at://")) throw new Error("URI de publication invalide.");
  if (!cid?.trim()) throw new Error("CID de publication manquant.");
  const reportingAgent = await getReportingAgent();
  await reportingAgent.api.com.atproto.moderation.createReport({
    reasonType,
    reason: cleanReportDescription(description),
    subject: { $type: "com.atproto.repo.strongRef", uri, cid },
  }, { encoding: "application/json" });
}

export async function reportAccount(did: string, reasonType: ReportReason, description?: string): Promise<void> {
  validateDid(did);
  const reportingAgent = await getReportingAgent();
  await reportingAgent.api.com.atproto.moderation.createReport({
    reasonType,
    reason: cleanReportDescription(description),
    subject: { $type: "com.atproto.admin.defs#repoRef", did },
  }, { encoding: "application/json" });
}
