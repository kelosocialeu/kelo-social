import { getReadAgent } from "@/lib/atproto/read-agent";

export type JournalMedia = {
  rkey: string;
  did: string;
  handle: string;
  displayName: string;
  international: boolean;
  continents: string[];
  countries: string[];
  addedAt: string;
};

export type JournalPost = {
  post: any;
  media: JournalMedia;
};

export async function getJournalMedia(): Promise<JournalMedia[]> {
  const response = await fetch("/api/journal/media", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Impossible de charger les médias du Journal.");
  return (data.media || []) as JournalMedia[];
}

export async function getJournalPosts(media: JournalMedia[], perMedia = 12): Promise<JournalPost[]> {
  if (media.length === 0) return [];
  const agent = await getReadAgent();

  const results = await Promise.allSettled(
    media.map(async (item) => {
      const response = await agent.api.app.bsky.feed.getAuthorFeed({
        actor: item.did,
        limit: perMedia,
        filter: "posts_no_replies",
      });

      return response.data.feed
        .filter((entry: any) => !entry.reason)
        .map((entry: any) => ({ post: entry.post, media: item }));
    })
  );

  return results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => {
      const aDate = new Date(a.post?.record?.createdAt || a.post?.indexedAt || 0).getTime();
      const bDate = new Date(b.post?.record?.createdAt || b.post?.indexedAt || 0).getTime();
      return bDate - aDate;
    });
}
