import { getReadAgent } from "@/lib/atproto/read-agent";

export async function getNotifications(
  limit = 30,
  cursor?: string
) {
  const agent = await getReadAgent();
  const response =
    await agent.api.app.bsky.notification.listNotifications({
      limit,
      cursor,
    });

  return {
    items: response.data.notifications,
    cursor: response.data.cursor,
  };
}

export async function getUnreadNotificationCount(): Promise<number> {
  const agent = await getReadAgent();
  const response =
    await agent.api.app.bsky.notification.getUnreadCount();

  return response.data.count || 0;
}

export async function markNotificationsSeen() {
  const agent = await getReadAgent();

  await agent.api.app.bsky.notification.updateSeen({
    seenAt: new Date().toISOString(),
  });
}
