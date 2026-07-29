import { getReadAgent } from "@/lib/atproto/read-agent";

export async function getPostThread(uri: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.feed.getPostThread({ uri });
  return res.data.thread;
}
