import { getAuthenticatedAgent } from "@/services/auth.service";

async function getNotificationAgent() {
  const { agent } = await getAuthenticatedAgent();
  return agent;
}

export async function getNotifications(
  limit = 30,
  cursor?: string
) {
  const agent = await getNotificationAgent();
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

/**
 * Compatible avec la version actuelle de @atproto/api : le compteur est
 * calculé depuis les notifications récentes plutôt que via un raccourci
 * absent de certaines versions du SDK.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const response = await getNotifications(50);

  return response.items.filter(
    (notification: any) => !notification.isRead
  ).length;
}

export async function markNotificationsSeen() {
  const agent = await getNotificationAgent();

  await agent.api.app.bsky.notification.updateSeen({
    seenAt: new Date().toISOString(),
  });
}
