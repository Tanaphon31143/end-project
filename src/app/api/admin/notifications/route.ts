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

  const [profileRequests] = await db.execute<(RowDataPacket & {
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
      createdAtEpoch: number;
  })[]>(
      `SELECT r.id, s.full_name studentName, s.student_code studentCode,
              r.field_type fieldType, r.old_value oldValue, r.new_value newValue,
              r.reason, r.attachment_name attachmentName,
              (r.attachment_data IS NOT NULL) hasAttachment,
              DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') createdAt,
              UNIX_TIMESTAMP(r.created_at) createdAtEpoch
       FROM profile_edit_requests r
       JOIN students s ON s.id = r.student_id
       WHERE r.status = 'PENDING'
       ORDER BY r.created_at DESC, r.id DESC`,
  );

  const [subjectRequests] = await db.execute<(RowDataPacket & {
    id: number;
    teacherName: string;
    subjectName: string;
    subjectCode: string;
    classroomName: string;
    semester: number;
    academicYear: string;
    createdAt: string;
    createdAtEpoch: number;
  })[]>(
    `SELECT r.id, t.full_name teacherName, r.subject_name subjectName,
            r.subject_code subjectCode, c.name classroomName,
            r.semester, r.academic_year academicYear,
            DATE_FORMAT(r.updated_at, '%d/%m/%Y %H:%i') createdAt,
            UNIX_TIMESTAMP(r.updated_at) createdAtEpoch
     FROM teacher_subject_requests r
     JOIN teachers t ON t.id = r.teacher_id
     JOIN classrooms c ON c.id = r.classroom_id
     WHERE r.status = 'PENDING'
     ORDER BY r.updated_at DESC, r.id DESC`,
  );

  const requests = [
    ...profileRequests.map((item) => ({
      ...item,
      kind: "PROFILE_EDIT" as const,
      hasAttachment: Boolean(item.hasAttachment),
    })),
    ...subjectRequests.map((item) => ({
      ...item,
      kind: "SUBJECT_REQUEST" as const,
    })),
  ]
    .sort((a, b) => Number(b.createdAtEpoch) - Number(a.createdAtEpoch));

  return NextResponse.json({
    pendingCount: requests.length,
    requests,
  });
}
