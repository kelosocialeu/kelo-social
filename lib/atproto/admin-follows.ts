import { AtpAgent } from "@atproto/api";

const FOLLOW_COLLECTION = "app.bsky.graph.follow";

function normalizeDid(value: string) {
  return value.trim().toLowerCase();
}

function newFollowRkey() {
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)).slice(0, 15);
}

export async function followCertifiedProfile(
  agent: AtpAgent,
  repoDid: string,
  subjectDid: string
): Promise<"followed" | "already-following" | "skipped"> {
  const subject = normalizeDid(subjectDid);
  const repo = normalizeDid(repoDid);

  if (!subject || subject === repo) return "skipped";

  let cursor: string | undefined;
  do {
    const response = await agent.api.com.atproto.repo.listRecords({
      repo,
      collection: FOLLOW_COLLECTION,
      limit: 100,
      cursor,
    });

    for (const item of response.data.records) {
      const value = item.value as Record<string, unknown>;
      if (normalizeDid(String(value.subject || "")) === subject) return "already-following";
    }

    cursor = response.data.cursor;
  } while (cursor);

  await agent.api.com.atproto.repo.createRecord({
    repo,
    collection: FOLLOW_COLLECTION,
    rkey: newFollowRkey(),
    record: {
      $type: FOLLOW_COLLECTION,
      subject,
      createdAt: new Date().toISOString(),
    },
    validate: false,
  });

  return "followed";
}
