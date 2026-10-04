import { AtpAgent } from "@atproto/api";
import { createHash } from "crypto";

const COLLECTION = "eu.kelosocial.trustdiscovery";
const CERTIFICATION_COLLECTION = "eu.kelosocial.certification";
const STATE_RKEY = "state";
const JETSTREAM = "wss://jetstream1.us-east.bsky.network/subscribe";
const PDS_URL =
  process.env.KELO_ADMIN_PDS_URL?.trim() ||
  process.env.CERTIFICATION_REPO_PDS_URL?.trim() ||
  process.env.KELO_PDS_URL?.trim() ||
  "https://pds.kelosocial.eu";
const IDENTIFIER =
  process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim() ||
  process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() ||
  "kelosocial.eu";
const PASSWORD =
  process.env.KELO_ADMIN_ATPROTO_PASSWORD?.trim() ||
  process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() ||
  "";

type Source = { label: string; url: string; result: "positive" | "neutral" | "negative" };
type Suggestion = {
  did: string;
  handle: string;
  displayName: string;
  description: string;
  avatar?: string;
  score: number;
  confidence: "high" | "medium" | "low";
  recommendation: "certification" | "trusted-certifier";
  recommendationTitle: string;
  recommendationSummary: string;
  reasons: string[];
  sources: Source[];
  officialWebsite?: string;
  discoveredAt: string;
  status: "pending";
};

let started = false;
let running = false;

function norm(v: string) { return v.trim().toLowerCase(); }
function baseDomain(handle: string) {
  const p = norm(handle).split(".");
  return p.length >= 2 ? p.slice(-2).join(".") : "";
}
function sameName(a: string, b: string) {
  const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9À-ÿ]+/g, " ").trim();
  const x = clean(a), y = clean(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}
function rkey(did: string) {
  return createHash("sha256").update(did).digest("hex").slice(0, 48);
}
function interesting(text: string) {
  return /journalist|journaliste|media|média|news|founder|fondateur|ceo|company|entreprise|group|groupe|corporation|association|ngo|ong|university|université|professor|institution|government|gouvernement|minister|ministre|politician|politique|creator|créateur|influencer|influenceur|artist|artiste|samsung|microsoft|google|apple|meta|amazon/i.test(text);
}

async function login() {
  if (!PASSWORD) throw new Error("Configuration administrateur AT Protocol manquante.");
  const agent = new AtpAgent({ service: PDS_URL });
  await agent.login({ identifier: IDENTIFIER, password: PASSWORD });
  if (!agent.session?.did) throw new Error("Session administrateur indisponible.");
  return { agent, did: agent.session.did };
}

async function getCertifiedDids(agent: AtpAgent, repoDid: string) {
  const set = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await agent.api.com.atproto.repo.listRecords({ repo: repoDid, collection: CERTIFICATION_COLLECTION, limit: 100, cursor });
    for (const item of page.data.records) {
      const v = item.value as Record<string, unknown>;
      if (v.status === "certified" && norm(String(v.issuerDid || "")) === norm(repoDid)) {
        const did = String(v.subjectDid || "").trim();
        if (did) set.add(did);
      }
    }
    cursor = page.data.cursor;
  } while (cursor);
  return set;
}

async function readState(agent: AtpAgent, repoDid: string) {
  try {
    const r = await agent.api.com.atproto.repo.getRecord({ repo: repoDid, collection: COLLECTION, rkey: STATE_RKEY });
    const v = r.data.value as Record<string, unknown>;
    return typeof v.cursor === "number" ? v.cursor : 0;
  } catch {
    return 0;
  }
}

async function writeState(agent: AtpAgent, repoDid: string, cursor: number) {
  await agent.api.com.atproto.repo.putRecord({
    repo: repoDid,
    collection: COLLECTION,
    rkey: STATE_RKEY,
    validate: false,
    record: { "$type": COLLECTION, cursor, updatedAt: new Date().toISOString() },
  });
}

async function saveSuggestion(agent: AtpAgent, repoDid: string, suggestion: Suggestion) {
  await agent.api.com.atproto.repo.putRecord({
    repo: repoDid,
    collection: COLLECTION,
    rkey: rkey(suggestion.did),
    validate: false,
    record: { "$type": COLLECTION, ...suggestion },
  });
}

async function inspect(did: string, certified: Set<string>): Promise<Suggestion | null> {
  if (certified.has(did)) return null;
  const response = await fetch("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=" + encodeURIComponent(did), {
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) return null;
  const profile = await response.json();
  const handle = String(profile?.handle || "");
  const displayName = String(profile?.displayName || handle);
  const description = String(profile?.description || "");
  if (!handle || !interesting([handle, displayName, description].join(" "))) return null;

  let score = 5;
  const reasons: string[] = ["Compte découvert directement dans le flux AT Protocol."];
  const sources: Source[] = [{ label: "Profil AT Protocol", url: "https://bsky.app/profile/" + handle, result: "positive" }];
  let officialWebsite = typeof profile?.website === "string" ? profile.website.trim() : "";
  if (profile?.verification?.verifiedStatus === "valid") {
    score += 35;
    reasons.push("Le compte possède une vérification publiée dans l'écosystème AT Protocol.");
    sources.push({ label: "Vérification AT Protocol", url: "https://bsky.app/profile/" + handle, result: "positive" });
  }
  if (handle.includes(".") && !handle.endsWith(".bsky.social")) {
    score += 15;
    reasons.push("Le compte utilise un domaine personnalisé.");
  }
  if (displayName && displayName !== handle) {
    score += 5;
    reasons.push("Identité publique renseignée.");
  }
  if (description.length >= 30) {
    score += 5;
    reasons.push("Présentation publique détaillée.");
  }

  if (officialWebsite) {
    try {
      const u = new URL(officialWebsite);
      if (u.protocol !== "http:" && u.protocol !== "https:") officialWebsite = "";
      else {
        const res = await fetch(u.toString(), {
          redirect: "follow",
          cache: "no-store",
          headers: { "User-Agent": "KeloSocial-TrustDiscovery/1.0" },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const html = (await res.text()).slice(0, 1_000_000).toLowerCase();
          const linked = html.includes(handle.toLowerCase()) || html.includes("bsky.app/profile/" + handle.toLowerCase());
          if (linked) {
            score += 30;
            reasons.push("Le site public associé renvoie vers ce compte, ce qui renforce l'identification.");
            sources.push({ label: "Site officiel : lien vers le compte", url: res.url || u.toString(), result: "positive" });
          } else {
            sources.push({ label: "Site public associé", url: res.url || u.toString(), result: "neutral" });
          }
          const title = html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1] || "";
          if (sameName(displayName, title)) {
            score += 10;
            reasons.push("Le nom public correspond au titre du site associé.");
          }
        }
      }
    } catch {}
  }

  const largeEntity = /group|groupe|corporation|corp|company|entreprise|foundation|fondation|university|université|government|gouvernement|institution|association|ngo|ong|media|média|news/i.test([displayName, description, officialWebsite].join(" "));
  const strongIdentity = profile?.verification?.verifiedStatus === "valid" && !!officialWebsite;
  const trusted = score >= 85 && largeEntity && strongIdentity;
  const recommendation = trusted ? "trusted-certifier" : "certification";
  return {
    did, handle, displayName, description,
    avatar: typeof profile?.avatar === "string" ? profile.avatar : undefined,
    score,
    confidence: score >= 70 ? "high" : score >= 50 ? "medium" : "low",
    recommendation,
    recommendationTitle: trusted ? "Suggestion : certificateur de confiance" : "Suggestion : certification",
    recommendationSummary: trusted
      ? "Entité fortement identifiable et potentiellement capable de certifier ses filiales, équipes ou entités rattachées. Une validation humaine et l'accord de l'entité restent obligatoires."
      : "Compte identifié comme candidat à une certification Kelo Social. Le robot ne certifie jamais automatiquement.",
    reasons,
    sources,
    officialWebsite: officialWebsite || undefined,
    discoveredAt: new Date().toISOString(),
    status: "pending",
  };
}

async function consume() {
  if (running || !PASSWORD) return;
  running = true;
  try {
    const { agent, did } = await login();
    const certified = await getCertifiedDids(agent, did);
    const cursor = await readState(agent, did);
    const params = new URLSearchParams();
    params.append("wantedCollections", "app.bsky.actor.profile");
    params.append("wantedCollections", "app.bsky.graph.verification");
    if (cursor > 0) params.set("cursor", String(cursor));
    const ws = new WebSocket(JETSTREAM + "?" + params.toString());
    let lastCursor = cursor;
    let processed = 0;
    const closeTimer = setTimeout(() => ws.close(), 20_000);

    await new Promise<void>((resolve) => {
      ws.onmessage = async (event) => {
        try {
          const payload = JSON.parse(typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data));
          if (payload.kind !== "commit") return;
          const nextCursor = Number(payload.time_us || 0);
          if (nextCursor > lastCursor) lastCursor = nextCursor;
          const did = String(payload.did || "");
          if (!did || payload.commit?.operation === "delete") return;
          processed++;
          if (processed > 50) { ws.close(); return; }
          if (!certified.has(did)) {
            const suggestion = await inspect(did, certified);
            if (suggestion) await saveSuggestion(agent, did, suggestion);
          }
        } catch (error) {
          console.error("[trust-discovery-worker] event error", error);
        }
      };
      ws.onclose = () => resolve();
      ws.onerror = () => resolve();
    });
    clearTimeout(closeTimer);
    if (lastCursor > cursor) await writeState(agent, did, lastCursor);
  } catch (error) {
    console.error("[trust-discovery-worker]", error);
  } finally {
    running = false;
  }
}

export function startTrustDiscoveryWorker() {
  if (started || !PASSWORD) return;
  started = true;
  void consume();
  setInterval(() => void consume(), 30_000);
}
