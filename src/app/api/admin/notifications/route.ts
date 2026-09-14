import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  }

  const [requests] = await db.execute<(RowDataPacket & {
      id: number;
      studentName: string;
      studentCode: string;
      fieldType: string;
      oldValue: string;
      newValue: string;
      reason: string;
      attachmentName: string | null;
      hasAttachment: number;
      createdAt: string;
  })[]>(
      `SELECT r.id, s.full_name studentName, s.student_code studentCode,
              r.field_type fieldType, r.old_value oldValue, r.new_value newValue,
              r.reason, r.attachment_name attachmentName,
              (r.attachment_data IS NOT NULL) hasAttachment,
              DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') createdAt
       FROM profile_edit_requests r
       JOIN students s ON s.id = r.student_id
       WHERE r.status = 'PENDING'
       ORDER BY r.created_at DESC, r.id DESC`,
  );

  return NextResponse.json({
    pendingCount: requests.length,
    requests: requests.map((item) => ({ ...item, hasAttachment: Boolean(item.hasAttachment) })),
  });
}
