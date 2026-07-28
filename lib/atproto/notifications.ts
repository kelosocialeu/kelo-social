import { getReadAgent } from "@/lib/atproto/read-agent";

export async function getNotifications(limit = 30, cursor?: string) {
  const agent = await getReadAgent();
  const res = await agent.api.app.bsky.notification.listNotifications({ limit, cursor });
  return { items: res.data.notifications, cursor: res.data.cursor };
}

export async function markNotificationsSeen() {
  const agent = await getReadAgent();
  await agent.api.app.bsky.notification.updateSeen({ seenAt: new Date().toISOString() });
}
