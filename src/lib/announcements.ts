import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "./db";

export type AnnouncementStatus = "published" | "scheduled" | "hidden";
export type AnnouncementAttachment = {
  id: number;
  name: string;
  type: string;
  size: number;
  url: string;
};
export type Announcement = {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  createdBy: string;
  published: boolean;
  scheduledAt: string | null;
  status: AnnouncementStatus;
  attachments: AnnouncementAttachment[];
};
export type AnnouncementStats = {
  total: number;
  published: number;
  scheduled: number;
  hidden: number;
};
export type AnnouncementCapabilities = {
  attachments: boolean;
  scheduling: boolean;
  richText: boolean;
  titleMaxLength: number;
};
export type AdminAnnouncementListing = {
  announcements: Announcement[];
  stats: AnnouncementStats;
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  capabilities: AnnouncementCapabilities;
};

export const MAX_ANNOUNCEMENT_TITLE_LENGTH = 200;
export const LEGACY_ANNOUNCEMENT_TITLE_LENGTH = 180;
export const MAX_ANNOUNCEMENT_MESSAGE_LENGTH = 5000;
export const MAX_ANNOUNCEMENT_ATTACHMENTS = 5;
export const MAX_ANNOUNCEMENT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ANNOUNCEMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const bangkokOffsetMs = 7 * 60 * 60 * 1000;

type CapabilityRows = RowDataPacket[] & { [index: number]: RowDataPacket & { Field?: string; Type?: string } };

export async function getAnnouncementCapabilities(): Promise<AnnouncementCapabilities> {
  const [columns] = await db.execute<CapabilityRows>("SHOW COLUMNS FROM school_announcements");
  const names = new Set(columns.map((column) => String(column.Field ?? "")));
  const [attachmentTables] = await db.execute<RowDataPacket[]>(
    "SHOW TABLES LIKE 'school_announcement_attachments'",
  );
  return {
    attachments: attachmentTables.length > 0,
    scheduling: names.has("publish_at"),
    richText: true,
    titleMaxLength: Number(
      /varchar\(\s*(\d+)\s*\)/i.exec(
        String(columns.find((column) => column.Field === "title")?.Type ?? ""),
      )?.[1] ?? 0,
    ) >= MAX_ANNOUNCEMENT_TITLE_LENGTH
      ? MAX_ANNOUNCEMENT_TITLE_LENGTH
      : LEGACY_ANNOUNCEMENT_TITLE_LENGTH,
  };
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  return Number.isSafeInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function statusExpression(hasScheduling: boolean, alias = "n") {
  return hasScheduling
    ? `CASE WHEN ${alias}.is_published=0 THEN 'hidden' WHEN ${alias}.publish_at>UTC_TIMESTAMP(3) THEN 'scheduled' ELSE 'published' END`
    : `CASE WHEN ${alias}.is_published=1 THEN 'published' ELSE 'hidden' END`;
}

function visibilityPredicate(hasScheduling: boolean, alias = "n") {
  return hasScheduling
    ? `(${alias}.is_published=1 AND (${alias}.publish_at IS NULL OR ${alias}.publish_at<=UTC_TIMESTAMP(3)))`
    : `${alias}.is_published=1`;
}

function statusPredicate(status: AnnouncementStatus, hasScheduling: boolean, alias = "n") {
  if (status === "hidden") return `${alias}.is_published=0`;
  if (status === "scheduled") {
    return hasScheduling
      ? `(${alias}.is_published=1 AND ${alias}.publish_at>UTC_TIMESTAMP(3))`
      : "1=0";
  }
  return visibilityPredicate(hasScheduling, alias);
}

function escapeLike(value: string) {
  return value.replace(/[!%_]/g, (match) => `!${match}`);
}

function bangkokIsoFromUtcSql(value: unknown): string | null {
  if (!value) return null;
  const raw = value instanceof Date
    ? value.toISOString().slice(0, 19).replace("T", " ")
    : String(value);
  const utcDate = new Date(`${raw.replace(" ", "T")}Z`);
  if (!Number.isFinite(utcDate.getTime())) return null;
  const localDate = new Date(utcDate.getTime() + bangkokOffsetMs);
  return `${localDate.toISOString().slice(0, 19)}+07:00`;
}

function normalizeAnnouncement(row: RowDataPacket, attachments: AnnouncementAttachment[] = []): Announcement {
  const published = Boolean(row.published);
  const scheduledAt = bangkokIsoFromUtcSql(row.scheduledAt);
  const status = String(row.status) as AnnouncementStatus;
  return {
    id: Number(row.id),
    title: String(row.title ?? ""),
    message: String(row.message ?? ""),
    createdAt: String(row.createdAt ?? ""),
    createdBy: String(row.createdBy || "ผู้ดูแลระบบ"),
    published,
    scheduledAt,
    status: ["published", "scheduled", "hidden"].includes(status)
      ? status
      : published ? "published" : "hidden",
    attachments,
  };
}

async function loadAttachmentMetadata(announcementIds: number[], enabled: boolean) {
  const result = new Map<number, AnnouncementAttachment[]>();
  if (!enabled || !announcementIds.length) return result;
  const placeholders = announcementIds.map(() => "?").join(",");
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT id,announcement_id announcementId,file_name name,mime_type type,file_size size
     FROM school_announcement_attachments
     WHERE announcement_id IN (${placeholders}) ORDER BY id`,
    announcementIds,
  );
  for (const row of rows) {
    const announcementId = Number(row.announcementId);
    const attachments = result.get(announcementId) ?? [];
    attachments.push({
      id: Number(row.id),
      name: String(row.name ?? ""),
      type: String(row.type ?? "application/octet-stream"),
      size: Number(row.size ?? 0),
      url: `/api/announcements/${announcementId}/attachments/${Number(row.id)}`,
    });
    result.set(announcementId, attachments);
  }
  return result;
}

function listSelect(hasScheduling: boolean) {
  const schedule = hasScheduling
    ? "DATE_FORMAT(n.publish_at,'%Y-%m-%d %H:%i:%s') scheduledAt"
    : "NULL scheduledAt";
  const status = statusExpression(hasScheduling);
  return `SELECT n.id,n.title,n.message,n.is_published published,${schedule},
      DATE_FORMAT(n.created_at,'%Y-%m-%d %H:%i') createdAt,
      COALESCE(a.full_name,'ผู้ดูแลระบบ') createdBy,${status} status
    FROM school_announcements n
    LEFT JOIN admins a ON a.id=n.created_by_admin_id`;
}

async function getItems(
  where: string,
  params: Array<string | number>,
  limit: number,
  offset: number,
  hasScheduling: boolean,
  hasAttachments: boolean,
  sort: "newest" | "oldest" | "title",
) {
  const ordering = sort === "oldest" ? "ASC" : "DESC";
  const orderBy = sort === "title" ? "n.title ASC,n.created_at DESC,n.id DESC" : `n.created_at ${ordering},n.id ${ordering}`;
  const [rows] = await db.execute<RowDataPacket[]>(
    `${listSelect(hasScheduling)}
     ${where ? `WHERE ${where}` : ""}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const ids = rows.map((row) => Number(row.id));
  const attachmentMap = await loadAttachmentMetadata(ids, hasAttachments);
  return rows.map((row) =>
    normalizeAnnouncement(row, attachmentMap.get(Number(row.id)) ?? []),
  );
}

export async function getAnnouncements(publishedOnly = true, limit = 5): Promise<Announcement[]> {
  const capabilities = await getAnnouncementCapabilities();
  const safeLimit = boundedInteger(limit, 5, 1, 100);
  const where = publishedOnly ? `WHERE ${visibilityPredicate(capabilities.scheduling)}` : "";
  return getItems(
    where.replace(/^WHERE\s+/i, ""),
    [],
    safeLimit,
    0,
    capabilities.scheduling,
    capabilities.attachments,
    "newest",
  );
}

export async function getAdminAnnouncements(options: {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string;
  sort?: string;
} = {}): Promise<AdminAnnouncementListing> {
  const capabilities = await getAnnouncementCapabilities();
  const page = boundedInteger(options.page, 1, 1, 100_000);
  const pageSize = boundedInteger(options.pageSize, 20, 1, 100);
  const query = String(options.query ?? "").trim().slice(0, 200);
  const status = ["published", "scheduled", "hidden"].includes(String(options.status))
    ? String(options.status) as AnnouncementStatus
    : null;
  const sort = options.sort === "oldest" ? "oldest" : options.sort === "title" ? "title" : "newest";
  const filters: string[] = [];
  const params: Array<string | number> = [];
  if (status) filters.push(statusPredicate(status, capabilities.scheduling));
  if (query) {
    filters.push("(n.title LIKE ? ESCAPE '!' OR n.message LIKE ? ESCAPE '!')");
    const escaped = `%${escapeLike(query)}%`;
    params.push(escaped, escaped);
  }
  const where = filters.join(" AND ");
  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) total FROM school_announcements n ${where ? `WHERE ${where}` : ""}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);
  const offset = (page - 1) * pageSize;
  const announcements = await getItems(
    where,
    params,
    pageSize,
    offset,
    capabilities.scheduling,
    capabilities.attachments,
    sort,
  );
  const [statRows] = await db.execute<RowDataPacket[]>(
    capabilities.scheduling
      ? `SELECT COUNT(*) total,
          COALESCE(SUM(is_published=1 AND (publish_at IS NULL OR publish_at<=UTC_TIMESTAMP(3))),0) published,
          COALESCE(SUM(is_published=1 AND publish_at>UTC_TIMESTAMP(3)),0) scheduled,
          COALESCE(SUM(is_published=0),0) hidden
        FROM school_announcements`
      : `SELECT COUNT(*) total,
          COALESCE(SUM(is_published=1),0) published,
          0 scheduled,
          COALESCE(SUM(is_published=0),0) hidden
        FROM school_announcements`,
  );
  const stats: AnnouncementStats = {
    total: Number(statRows[0]?.total ?? 0),
    published: Number(statRows[0]?.published ?? 0),
    scheduled: Number(statRows[0]?.scheduled ?? 0),
    hidden: Number(statRows[0]?.hidden ?? 0),
  };
  return {
    announcements,
    stats,
    total,
    page,
    pageSize,
    hasMore: total > page * pageSize,
    capabilities,
  };
}
