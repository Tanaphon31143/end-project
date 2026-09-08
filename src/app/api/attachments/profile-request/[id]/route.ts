import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getAdminSession, getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const SAFE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const resolvedParams = await params;
  const requestId = Number(resolvedParams.id);

  if (!Number.isInteger(requestId) || requestId < 1) {
    return NextResponse.json({ message: "ไม่พบไฟล์แนบ" }, { status: 400 });
  }

  // Authentication & Authorization check:
  // Must be student (owner) OR admin
  const [studentSession, adminSession] = await Promise.all([
    getStudentSession(),
    getAdminSession(),
  ]);

  if (!studentSession && !adminSession) {
    return NextResponse.json({ message: "กรุณาเข้าสู่ระบบก่อนดูไฟล์" }, { status: 401 });
  }

  const [rows] = await db.execute<
    (RowDataPacket & {
      studentId: number;
      attachmentName: string | null;
      attachmentMime: string | null;
      attachmentData: Buffer | null;
    })[]
  >(
    `SELECT student_id studentId,
            attachment_name attachmentName,
            attachment_mime attachmentMime,
            attachment_data attachmentData
     FROM profile_edit_requests
     WHERE id = ?
     LIMIT 1`,
    [requestId],
  );

  const item = rows[0];
  if (!item || !item.attachmentData) {
    return NextResponse.json({ message: "ไม่พบไฟล์แนบของคำร้องนี้" }, { status: 404 });
  }

  // Ownership verification: student can ONLY access their own request attachments
  if (studentSession && item.studentId !== studentSession.id) {
    return NextResponse.json(
      { message: "คุณไม่มีสิทธิ์เข้าถึงไฟล์แนบนี้ (403 Forbidden)" },
      { status: 403 },
    );
  }

  const mime = item.attachmentMime || "application/octet-stream";
  if (!SAFE_MIME_TYPES.has(mime)) {
    return NextResponse.json(
      { message: "ประเภทไฟล์ไม่ได้รับอนุญาตให้เปิดเพื่อความปลอดภัย" },
      { status: 403 },
    );
  }

  // Sanitize filename to prevent header injection
  const safeFilename = (item.attachmentName || "attachment")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 150);

  const isDownload = new URL(request.url).searchParams.get("download") === "1";
  const disposition = isDownload ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(item.attachmentData), {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
