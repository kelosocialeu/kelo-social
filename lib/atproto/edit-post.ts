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

  if (repo !== session.did) {
    throw new Error("Vous ne pouvez modifier que vos propres publications.");
  }

  const text = nextText.trim();
  const hasExistingContent = Boolean(originalRecord?.embed);

  if (!text && !hasExistingContent) {
    throw new Error("La publication doit contenir du texte ou un média.");
  }

  if (countCharacters(text) > POST_CHARACTER_LIMIT) {
    throw new Error(`La publication ne peut pas dépasser ${POST_CHARACTER_LIMIT} caractères.`);
  }

  const richText = new RichText({ text });
  if (text) await richText.detectFacets(agent);

  const record = {
    ...originalRecord,
    $type: "app.bsky.feed.post",
    text: richText.text,
    facets: richText.facets,
  };

  const result = await agent.api.com.atproto.repo.putRecord({
    repo: session.did,
    collection: "app.bsky.feed.post",
    rkey,
    record,
  });

  return {
    uri: result.data.uri,
    cid: result.data.cid,
    text: richText.text,
    facets: richText.facets,
    record,
  };
}
