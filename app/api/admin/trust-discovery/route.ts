// Trust discovery source typing is intentionally explicit to keep production builds strict.
import { NextRequest, NextResponse } from "next/server";
import { AtpAgent } from "@atproto/api";
import { decideTrustDiscoverySuggestion, getTrustDiscoverySuggestions } from "@/lib/atproto/trust-discovery-worker";

const APPVIEW = "https://public.api.bsky.app/xrpc";
const PDS_URL = process.env.KELO_ADMIN_PDS_URL?.trim() || process.env.CERTIFICATION_REPO_PDS_URL?.trim() || process.env.KELO_PDS_URL?.trim() || "https://pds.kelosocial.eu";
const ADMIN_IDENTIFIER = process.env.KELO_ADMIN_ATPROTO_IDENTIFIER?.trim() || process.env.CERTIFICATION_REPO_IDENTIFIER?.trim() || "kelosocial.eu";
const ADMIN_PASSWORD = process.env.KELO_ADMIN_ATPROTO_PASSWORD?.trim() || process.env.CERTIFICATION_REPO_APP_PASSWORD?.trim() || "";

type Source = { label: string; url: string; result: "positive" | "neutral" | "negative" };

type Candidate = {
  did: string;
  handle: string;
  displayName: string;
  description?: string;
  avatar?: string;
  verification?: { verifiedStatus?: string; trustedVerifierStatus?: string };
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  sources: Source[];
  officialWebsite?: string;
  recommendation: "certification" | "trusted-certifier";
  recommendationTitle: string;
  recommendationSummary: string;
  discoveredAt?: string;
};

function norm(v: string) { return v.trim().replace(/^@/, "").toLowerCase(); }
function adminHandles() { return (process.env.ADMIN_HANDLES || "").split(",").map(norm).filter(Boolean); }
function adminDids() { return (process.env.ADMIN_DIDS || "").split(",").map(norm).filter(Boolean); }

async function assertAdmin(session: any) {
  if (!session?.accessJwt || !session?.pdsUrl || !session?.handle || !session?.did) throw new Error("Session invalide.");
  const agent = new AtpAgent({ service: session.pdsUrl });
  await agent.resumeSession({ accessJwt: session.accessJwt, refreshJwt: session.refreshJwt || "", active: true, handle: session.handle, did: session.did });
  const s = await agent.api.com.atproto.server.getSession();
  const did = norm(s.data.did || ""), handle = norm(s.data.handle || "");
  if (!adminDids().includes(did) && !adminHandles().includes(handle)) throw new Error("Accès réservé à l’administrateur Kelo Social.");
}

async function json(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function urlsFromText(text: string): string[] {
  return Array.from(text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)).map(m => m[0].replace(/[.,;:!?]+$/, "")).slice(0, 5);
}

function hostOf(url: string) {
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function baseDomain(handle: string) {
  const parts = norm(handle).split(".");
  return parts.length >= 2 ? parts.slice(-2).join(".") : "";
}

function sameName(a: string, b: string) {
  const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9À-ÿ]+/g, " ").trim();
  const x = clean(a), y = clean(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}

async function inspectWebsite(url: string, handle: string, displayName: string): Promise<{ sources: Source[]; officialWebsite?: string; score: number }> {
  const sources: Source[] = [];
  const addSource = (label: string, sourceUrl: string, result: Source["result"]) => sources.push({ label, url: sourceUrl, result });
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return { sources, officialWebsite: undefined, score: 0 };
    const response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "KeloSocial-TrustDiscovery/1.0" },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { sources: [{ label: "Site officiel", url: parsed.toString(), result: "negative" } satisfies Source], officialWebsite: parsed.toString(), score: 0 };
    const html = (await response.text()).slice(0, 1_000_000);
    const lower = html.toLowerCase();
    const handleVariants = [handle.toLowerCase(), "@" + handle.toLowerCase()];
    const linkedBack = handleVariants.some(v => lower.includes(v)) || lower.includes("bsky.app/profile/" + handle.toLowerCase());
    const nameMatch = sameName(displayName, (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ""));
    let score = 0;
    if (linkedBack) {
      score += 25;
      addSource("Site officiel : lien vers le compte", parsed.toString(), "positive");
    } else {
      addSource("Site officiel", parsed.toString(), "neutral");
    }
    if (nameMatch) {
      score += 10;
      addSource("Concordance du nom", parsed.toString(), "positive");
    }
    return { sources, officialWebsite: response.url || parsed.toString(), score };
  } catch {
    return { sources: [{ label: "Site externe inaccessible", url, result: "neutral" } satisfies Source], officialWebsite: url, score: 0 };
  }
}

async function searchActors(query: string) {
  const url = new URL(APPVIEW + "/app.bsky.actor.searchActors");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "25");
  const data = await json(url.toString());
  return Array.isArray(data?.actors) ? data.actors : [];
}

async function getProfile(actor: string) {
  try {
    const url = new URL(APPVIEW + "/app.bsky.actor.getProfile");
    url.searchParams.set("actor", actor);
    return await json(url.toString());
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await assertAdmin(body?.session);

    if (body?.mode === "list") {
      const candidates = getTrustDiscoverySuggestions() as Candidate[];
      return NextResponse.json({
        success: true,
        candidates,
        storage: "memory",
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body?.mode === "decision") {
      const did = String(body?.did || "").trim();
      const decision = String(body?.decision || "");
      if (!did) return NextResponse.json({ error: "DID manquant." }, { status: 400 });
      if (!["rejected", "certified", "trusted-certifier"].includes(decision)) {
        return NextResponse.json({ error: "Décision invalide." }, { status: 400 });
      }
      decideTrustDiscoverySuggestion(did, decision as "rejected" | "certified" | "trusted-certifier");
      return NextResponse.json({ success: true, did, decision });
    }

    const category = String(body?.category || "all");
    const customQuery = String(body?.query || "").trim().slice(0, 80);
    const querySets: Record<string, string[]> = {
      media: ["journaliste", "journalist", "média", "news", "media"],
      enterprise: ["CEO", "fondateur", "founder", "entreprise", "company"],
      association: ["association", "ONG", "nonprofit", "organisation"],
      institution: ["institution", "mairie", "gouvernement", "government"],
      university: ["université", "university", "professeur", "professor"],
      political: ["parti politique", "political party", "politician", "député", "senator"],
      influencer: ["créateur", "creator", "influenceur", "influencer", "artist"],
      all: ["journaliste", "founder", "association", "university", "institution", "creator", "influencer"],
    };
    const queries = customQuery ? [customQuery] : querySets[category] || querySets.all;

    const actorsByDid = new Map<string, any>();
    for (const query of queries.slice(0, 8)) {
      try {
        const actors = await searchActors(query);
        for (const actor of actors) if (actor?.did && actor?.handle) actorsByDid.set(actor.did, actor);
      } catch {}
    }

    const results: Candidate[] = [];
    for (const actor of Array.from(actorsByDid.values()).slice(0, 60)) {
      const profile = await getProfile(actor.did);
      const displayName = String(profile?.displayName || actor.displayName || actor.handle);
      const description = String(profile?.description || actor.description || "");
      const text = [displayName, description, actor.handle].join(" ");
      const profileWebsite = typeof profile?.website === "string" ? profile.website.trim() : "";
      const links = Array.from(new Set([
        ...(profileWebsite ? [profileWebsite] : []),
        ...urlsFromText(text),
      ]));
      const profileLinks = Array.isArray(actor.viewer?.associated?.chat) ? [] : [];
      const externalLinks = links.length ? links : [];

      let score = 0;
      const reasons: string[] = [];
      const sources: Source[] = [
        { label: "Profil AT Protocol public", url: "https://bsky.app/profile/" + actor.handle, result: "positive" }
      ];

      if (actor.verification?.verifiedStatus === "valid") {
        score += 35;
        reasons.push("Compte déjà vérifié par l’écosystème AT Protocol.");
        sources.push({ label: "Vérification AT Protocol", url: "https://bsky.app/profile/" + actor.handle, result: "positive" });
      }
      if (actor.verification?.trustedVerifierStatus === "valid") {
        score += 15;
        reasons.push("Présence d'un statut de certificateur de confiance AT Protocol.");
      }
      if (actor.handle.includes(".") && !actor.handle.endsWith(".bsky.social")) {
        score += 10;
        reasons.push("Handle sur un domaine personnalisé.");
      }
      if (displayName !== actor.handle && displayName.trim().length >= 3) {
        score += 5;
        reasons.push("Nom public renseigné.");
      }
      if (description.length >= 30) {
        score += 5;
        reasons.push("Présentation publique suffisamment détaillée.");
      }

      let officialWebsite: string | undefined;
      let websiteDomain = "";
      for (const link of externalLinks.slice(0, 2)) {
        const checked = await inspectWebsite(link, actor.handle, displayName);
        score += checked.score;
        sources.push(...checked.sources);
        officialWebsite ||= checked.officialWebsite;
        websiteDomain ||= hostOf(checked.officialWebsite || link);
      }

      const customDomain = actor.handle.includes(".") && !actor.handle.endsWith(".bsky.social");
      const domainMatchesHandle = customDomain && !!websiteDomain && (websiteDomain === baseDomain(actor.handle) || websiteDomain.endsWith("." + baseDomain(actor.handle)));
      if (domainMatchesHandle) {
        score += 15;
        reasons.push("Le domaine du compte correspond au domaine du site public associé.");
        sources.push({ label: "Concordance du domaine", url: officialWebsite || "https://bsky.app/profile/" + actor.handle, result: "positive" });
      }

      const organizationWords = /\b(group|groupe|corporation|corp|company|entreprise|foundation|fondation|university|université|government|gouvernement|institution|association|ngo|ong|media|média|news)\b/i;
      const looksLikeLargeEntity = organizationWords.test([displayName, description, websiteDomain].join(" "));
      const hasStrongIdentityEvidence = actor.verification?.verifiedStatus === "valid" && !!officialWebsite && (sources.some(source => source.label.includes("lien vers le compte") && source.result === "positive") || domainMatchesHandle);
      const recommendation: Candidate["recommendation"] = score >= 85 && hasStrongIdentityEvidence && looksLikeLargeEntity ? "trusted-certifier" : "certification";
      const recommendationTitle = recommendation === "trusted-certifier" ? "Suggestion : certificateur de confiance" : "Suggestion : certification";
      const recommendationSummary = recommendation === "trusted-certifier"
        ? "Entité majeure identifiée comme fortement authentifiable pour être proposée comme certificateur de confiance. Après validation humaine et accord de l’entité, elle pourrait certifier ses filiales, équipes ou entités rattachées."
        : "Compte ou entité identifié comme candidat à une certification Kelo Social. La décision et l’attribution restent entièrement humaines.";

      if (score < 35) continue;
      const confidence: Candidate["confidence"] = score >= 70 ? "high" : score >= 50 ? "medium" : "low";
      results.push({
        did: actor.did,
        handle: actor.handle,
        displayName,
        description,
        avatar: actor.avatar,
        verification: actor.verification,
        score: Math.min(score, 100),
        confidence,
        reasons,
        sources,
        officialWebsite,
        recommendation,
        recommendationTitle,
        recommendationSummary,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return NextResponse.json({
      success: true,
      scannedQueries: queries,
      candidates: results.slice(0, 30),
      disclaimer: "Le robot ne certifie jamais et ne nomme jamais automatiquement un certificateur de confiance. Il formule uniquement des suggestions argumentées à partir de sources publiques ; toute décision reste humaine.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[admin/trust-discovery]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analyse impossible." }, { status: 500 });
  }
}
