import { RichText } from "@atproto/api";

import { getAuthenticatedAgent } from "@/services/auth.service";
import { requireIdentityVerification } from "@/lib/atproto/verification-guard";
import { POST_CHARACTER_LIMIT } from "@/lib/atproto/posts";

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function parsePostUri(uri: string) {
  const match = /^at:\/\/([^/]+)\/app\.bsky\.feed\.post\/([^/?#]+)$/.exec(uri || "");
  if (!match) throw new Error("URI de publication AT Protocol invalide.");
  return { repo: match[1], rkey: match[2] };
}

export async function editOwnPost(
  uri: string,
  originalRecord: Record<string, any>,
  nextText: string
) {
  await requireIdentityVerification();

  const { agent, session } = await getAuthenticatedAgent();
  const { repo, rkey } = parsePostUri(uri);

  const normalizedHandle = session.handle?.replace(/^@/, "").toLowerCase();
  const normalizedRepo = repo.replace(/^@/, "").toLowerCase();
  const ownsRecord = repo === session.did || normalizedRepo === normalizedHandle;

  if (!ownsRecord) {
    throw new Error("Vous ne pouvez modifier que vos propres publications.");
  }

  // Récupère d'abord la version autoritative stockée dans le dépôt AT Protocol
  // du compte. On ne dépend donc pas uniquement de la copie affichée par Kelo Social.
  let authoritativeRecord: Record<string, any> = originalRecord || {};
  try {
    const current = await agent.api.com.atproto.repo.getRecord({
      repo: session.did,
      collection: "app.bsky.feed.post",
      rkey,
    });
    if (current.data?.value && typeof current.data.value === "object") {
      authoritativeRecord = current.data.value as Record<string, any>;
    }
  } catch (error) {
    console.warn("Impossible de relire le record avant modification, utilisation de la copie locale.", error);
  }

  const text = nextText.trim();
  const hasExistingContent = Boolean(authoritativeRecord?.embed);

  if (!text && !hasExistingContent) {
    throw new Error("La publication doit contenir du texte ou un média.");
  }

  if (countCharacters(text) > POST_CHARACTER_LIMIT) {
    throw new Error(`La publication ne peut pas dépasser ${POST_CHARACTER_LIMIT} caractères.`);
  }

  const richText = new RichText({ text });
  if (text) await richText.detectFacets(agent);

  const record = {
    ...authoritativeRecord,
    $type: "app.bsky.feed.post",
    text: richText.text,
    facets: richText.facets,
  };

  // putRecord remplace le record existant avec le même rkey directement dans
  // le dépôt public AT Protocol. Le PDS produit alors un nouveau commit repo,
  // qui est distribué aux relays et peut être indexé par les autres AppViews.
  const result = await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: "app.bsky.feed.post",
    rkey,
    record,
  });

  // Vérifie la lecture depuis le PDS après écriture. Cela garantit que Kelo
  // n'affiche pas seulement une modification locale qui n'aurait pas été écrite.
  const confirmed = await agent.api.com.atproto.repo.getRecord({
    repo: session.did,
    collection: "app.bsky.feed.post",
    rkey,
  });

  const confirmedRecord = (confirmed.data?.value && typeof confirmed.data.value === "object")
    ? confirmed.data.value as Record<string, any>
    : record;

  return {
    uri: result.data.uri,
    cid: confirmed.data?.cid || result.data.cid,
    text: String(confirmedRecord.text ?? richText.text),
    facets: confirmedRecord.facets ?? richText.facets,
    record: confirmedRecord,
  };
}
