import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { db } from "./db";

export type NotificationType =
  | "SESSION_OPENED"
  | "SESSION_EXPIRING"
  | "REQUEST_APPROVED"
  | "REQUEST_REJECTED"
  | "ATTENDANCE_LATE"
  | "ATTENDANCE_ABSENT"
  | "ATTENDANCE_ANOMALY"
  | "INFO";

export type AppNotification = {
  id: number;
  userId: number;
  userRole: "student" | "teacher" | "admin";
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export async function createNotification(params: {
  userId: number;
  userRole?: "student" | "teacher" | "admin";
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | number | null;
  actionUrl?: string | null;
}): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO notifications (user_id, user_role, type, title, message, related_entity_type, related_entity_id, action_url, is_read)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      params.userId,
      params.userRole || "student",
      params.type,
      params.title,
      params.message,
      params.relatedEntityType || null,
      params.relatedEntityId ? String(params.relatedEntityId) : null,
      params.actionUrl || null,
    ],
  );
  return result.insertId;
}

export type NotificationsResult = {
  notifications: AppNotification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getStudentNotifications(
  studentId: number,
  limit = 20,
  page = 1,
): Promise<NotificationsResult> {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safePage = Math.max(1, page);
  const offset = (safePage - 1) * safeLimit;

  const [[items], [countRow], [totalRow]] = await Promise.all([
    db.execute<
      (RowDataPacket & {
        id: number;
        userId: number;
        userRole: "student" | "teacher" | "admin";
        type: NotificationType;
        title: string;
        message: string;
        relatedEntityType: string | null;
        relatedEntityId: string | null;
        actionUrl: string | null;
        isRead: number;
        readAt: string | null;
        createdAt: string;
      })[]
    >(
      `SELECT id, user_id userId, user_role userRole, type, title, message,
              related_entity_type relatedEntityType, related_entity_id relatedEntityId,
              action_url actionUrl, is_read isRead,
              DATE_FORMAT(read_at, '%Y-%m-%d %H:%i') readAt,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') createdAt
       FROM notifications
       WHERE user_id = ? AND user_role = 'student'
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [studentId, safeLimit, offset],
    ),
    db.execute<(RowDataPacket & { unread: number })[]>(
      `SELECT COUNT(*) unread FROM notifications
       WHERE user_id = ? AND user_role = 'student' AND is_read = 0`,
      [studentId],
    ),
    db.execute<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) total FROM notifications
       WHERE user_id = ? AND user_role = 'student'`,
      [studentId],
    ),
  ]);

  const total = Number(totalRow[0]?.total || 0);

  return {
    notifications: items.map((row) => ({
      ...row,
      isRead: Boolean(row.isRead),
    })),
    unreadCount: Number(countRow[0]?.unread || 0),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}

export async function markNotificationAsRead(
  studentId: number,
  notificationId?: number,
): Promise<void> {
  if (notificationId) {
    await db.execute(
      `UPDATE notifications
       SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND user_role = 'student'`,
      [notificationId, studentId],
    );
  } else {
    await db.execute(
      `UPDATE notifications
       SET is_read = 1, read_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND user_role = 'student' AND is_read = 0`,
      [studentId],
    );
  }
}
