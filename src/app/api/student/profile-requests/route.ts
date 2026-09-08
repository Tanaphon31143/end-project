import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const ALLOWED_FIELDS = new Set([
  "FULL_NAME",
  "STUDENT_CODE",
  "GRADE_LEVEL",
  "CLASSROOM",
  "CLASS_NUMBER",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

export async function GET() {
  const student = await getStudentSession();
  if (!student) {
    return NextResponse.json({ message: "กรุณาเข้าสู่ระบบนักเรียน" }, { status: 401 });
  }

  const [requests] = await db.execute<
    (RowDataPacket & {
      id: number;
      studentId: number;
      fieldType: string;
      oldValue: string;
      newValue: string;
      reason: string;
      status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
      rejectionReason: string | null;
      attachmentName: string | null;
      attachmentMime: string | null;
      attachmentSize: number | null;
      hasAttachment: number;
      createdAt: string;
      reviewedAt: string | null;
    })[]
  >(
    `SELECT id,
            student_id studentId,
            field_type fieldType,
            old_value oldValue,
            new_value newValue,
            reason,
            status,
            rejection_reason rejectionReason,
            attachment_name attachmentName,
            attachment_mime attachmentMime,
            attachment_size attachmentSize,
            (attachment_data IS NOT NULL) hasAttachment,
            DATE_FORMAT(created_at, '%d/%m/%Y %H:%i') createdAt,
            DATE_FORMAT(reviewed_at, '%d/%m/%Y %H:%i') reviewedAt
     FROM profile_edit_requests
     WHERE student_id = ?
     ORDER BY created_at DESC, id DESC`,
    [student.id],
  );

  return NextResponse.json({
    requests: requests.map((r) => ({
      ...r,
      hasAttachment: Boolean(r.hasAttachment),
    })),
  });
}

export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student) {
    return NextResponse.json({ message: "กรุณาเข้าสู่ระบบนักเรียน" }, { status: 401 });
  }

  const form = await request.formData();
  const fieldType = String(form.get("fieldType") || "").toUpperCase();
  const oldValue = String(form.get("oldValue") || "").trim();
  const newValue = String(form.get("newValue") || "").trim();
  const reason = String(form.get("reason") || "").trim();
  const attachment = form.get("attachment");

  if (!ALLOWED_FIELDS.has(fieldType)) {
    return NextResponse.json(
      { message: "ประเภทข้อมูลที่ขอแก้ไขไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  if (!newValue) {
    return NextResponse.json(
      { message: "กรุณาระบุข้อมูลใหม่ที่ต้องการแก้ไข" },
      { status: 400 },
    );
  }

  if (reason.length < 5 || reason.length > 1000) {
    return NextResponse.json(
      { message: "กรุณาระบุเหตุผลในการขอแก้ไขข้อมูลอย่างน้อย 5 ตัวอักษร" },
      { status: 400 },
    );
  }

  // Check for duplicate pending requests of the same field type
  const [existingPending] = await db.execute<RowDataPacket[]>(
    `SELECT id FROM profile_edit_requests
     WHERE student_id = ? AND field_type = ? AND status = 'PENDING'
     LIMIT 1`,
    [student.id, fieldType],
  );

  if (existingPending.length > 0) {
    return NextResponse.json(
      {
        message: "คุณมีคำร้องแก้ไขข้อมูลประเภทนี้ที่อยู่ระหว่างรอการตรวจสอบอยู่แล้ว ไม่สามารถส่งซ้ำได้",
        code: "DUPLICATE_PENDING_REQUEST",
      },
      { status: 409 },
    );
  }

  // Handle optional attachment with strict security validations
  let attachmentData: Buffer | null = null;
  let attachmentName: string | null = null;
  let attachmentMime: string | null = null;
  let attachmentSize: number | null = null;

  if (attachment instanceof File && attachment.size > 0) {
    if (!ALLOWED_MIME_TYPES.has(attachment.type)) {
      return NextResponse.json(
        {
          message: "ไฟล์แนบต้องเป็น JPG, JPEG, PNG หรือ PDF เท่านั้น",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 },
      );
    }

    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        {
          message: "ขนาดไฟล์แนบต้องไม่เกิน 5 MB",
          code: "FILE_TOO_LARGE",
        },
        { status: 400 },
      );
    }

    // Sanitize file name
    attachmentName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    attachmentMime = attachment.type;
    attachmentSize = attachment.size;
    attachmentData = Buffer.from(await attachment.arrayBuffer());
  }

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO profile_edit_requests (
      student_id, field_type, old_value, new_value, reason,
      attachment_name, attachment_mime, attachment_size, attachment_data,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [
      student.id,
      fieldType,
      oldValue,
      newValue,
      reason,
      attachmentName,
      attachmentMime,
      attachmentSize,
      attachmentData,
    ],
  );

  return NextResponse.json(
    {
      id: result.insertId,
      message: "ยื่นคำร้องแก้ไขข้อมูลเรียบร้อยแล้ว เจ้าหน้าที่จะตรวจสอบคำร้องของคุณ",
    },
    { status: 201 },
  );
}
