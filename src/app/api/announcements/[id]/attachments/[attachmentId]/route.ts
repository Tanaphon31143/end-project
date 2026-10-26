import { getAdminSession, getStudentSession } from "@/lib/auth";
import { getAnnouncementCapabilities } from "@/lib/announcements";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

function safeFilename(value: string) {
  return value.replace(/[\\/\u0000-\u001f\u007f]/g, "_").slice(0, 255) || "attachment";
}

function contentDispositionFilename(value: string) {
  const filename = safeFilename(value);
  const fallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\;]/g, "_");
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const admin = await getAdminSession();
  const student = admin ? null : await getStudentSession();
  if (!admin && !student) {
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  }

  const { id: rawAnnouncementId, attachmentId: rawAttachmentId } = await params;
  const announcementId = Number(rawAnnouncementId);
  const attachmentId = Number(rawAttachmentId);
  if (
    !Number.isSafeInteger(announcementId) || announcementId < 1 ||
    !Number.isSafeInteger(attachmentId) || attachmentId < 1
  ) return new Response(null, { status: 404 });

  const capabilities = await getAnnouncementCapabilities();
  if (!capabilities.attachments) return new Response(null, { status: 404 });
  const visibleToStudent = capabilities.scheduling
    ? "AND n.is_published=1 AND (n.publish_at IS NULL OR n.publish_at<=UTC_TIMESTAMP(3))"
    : "AND n.is_published=1";
  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT f.file_name name,f.mime_type mime,f.file_data data
     FROM school_announcement_attachments f
     JOIN school_announcements n ON n.id=f.announcement_id
     WHERE n.id=? AND f.id=? ${student ? visibleToStudent : ""}`,
    [announcementId, attachmentId],
  );
  const file = rows[0];
  if (!file?.data) return new Response(null, { status: 404 });
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
  const mime = String(file.mime ?? "");
  if (!allowedTypes.has(mime)) return new Response(null, { status: 404 });
  const query = new URL(request.url).searchParams;
  const disposition = contentDispositionFilename(String(file.name ?? "attachment"))
    .replace(/^inline/, query.get("download") === "1" ? "attachment" : "inline");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "no-referrer",
    },
  });
}
