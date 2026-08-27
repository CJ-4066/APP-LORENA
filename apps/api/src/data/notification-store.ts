import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import { isDatabaseConfigured, query } from "../infrastructure/database.js";

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  deepLink: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationRow extends QueryResultRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  deep_link: string;
  is_read: boolean;
  created_at: Date | string;
}

function mapNotificationRow(row: NotificationRow): InAppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    deepLink: row.deep_link,
    isRead: row.is_read,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

const mockNotifications: InAppNotification[] = [];

export async function createNotification(
  userId: string,
  title: string,
  body: string,
  deepLink: string,
): Promise<InAppNotification> {
  const notificationId = randomUUID();
  if (!isDatabaseConfigured()) {
    const mock: InAppNotification = {
      id: notificationId,
      userId,
      title,
      body,
      deepLink,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    mockNotifications.push(mock);
    return mock;
  }

  const result = await query<NotificationRow>(
    `
      insert into in_app_notifications (id, user_id, title, body, deep_link)
      values ($1, $2, $3, $4, $5)
      returning id, user_id, title, body, deep_link, is_read, created_at
    `,
    [notificationId, userId, title, body, deepLink],
  );

  return mapNotificationRow(result.rows[0]);
}

export async function getUserNotifications(userId: string): Promise<InAppNotification[]> {
  if (!isDatabaseConfigured()) {
    return mockNotifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const result = await query<NotificationRow>(
    `
      select id, user_id, title, body, deep_link, is_read, created_at
      from in_app_notifications
      where user_id = $1
      order by created_at desc
      limit 50
    `,
    [userId],
  );

  return result.rows.map(mapNotificationRow);
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    const found = mockNotifications.find((n) => n.id === notificationId && n.userId === userId);
    if (found) {
      found.isRead = true;
    }
    return;
  }

  await query(
    `
      update in_app_notifications
      set is_read = true
      where id = $1 and user_id = $2
    `,
    [notificationId, userId],
  );
}

export async function notifyAllUsers(
  title: string,
  body: string,
  deepLink: string,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  // Get all user IDs
  const usersResult = await query<{ id: string }>("select id from users");
  for (const userRow of usersResult.rows) {
    await createNotification(userRow.id, title, body, deepLink);
  }
}
