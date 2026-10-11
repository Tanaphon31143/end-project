import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "./db";
export type Announcement = { id: number; title: string; message: string; createdAt: string; published: boolean };
export async function getAnnouncements(publishedOnly = true, limit = 5): Promise<Announcement[]> {
  const [rows] = await db.execute<RowDataPacket[]>(`SELECT id,title,message,is_published published,DATE_FORMAT(created_at,'%Y-%m-%d %H:%i') createdAt
    FROM school_announcements ${publishedOnly ? "WHERE is_published=1" : ""} ORDER BY created_at DESC,id DESC LIMIT ${Math.max(1, Math.min(100, Math.trunc(limit)))}`);
  return rows.map((row) => ({ id: row.id, title: row.title, message: row.message, createdAt: row.createdAt, published: Boolean(row.published) }));
}
