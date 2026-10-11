import { getAdminSession, getTeacherSession } from "@/lib/auth";
import { getAttendanceIssues } from "@/lib/attendance-issues";
import { db } from "@/lib/db";
import { protectTeacherMutation } from "@/lib/api-security";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";
export async function GET() {
  const admin = await getAdminSession();
  const teacher = admin ? null : await getTeacherSession();
  if (!admin && !teacher) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  return Response.json({ issues: await getAttendanceIssues(teacher?.id) });
}
export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  const teacher = admin ? null : await getTeacherSession();
  if (!admin && !teacher) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const blocked = protectTeacherMutation(request, admin?.id || teacher!.id, "review-attendance-issue");
  if (blocked) return blocked;
  const body = await request.json().catch(() => null);
  const id = Number(body?.id), status = body?.status, resolution = typeof body?.resolution === "string" ? body.resolution.trim() : "";
  if (!Number.isSafeInteger(id) || id < 1 || !["REVIEWING", "COMPLETED", "REJECTED"].includes(status) || resolution.length > 3000 || (["COMPLETED", "REJECTED"].includes(status) && !resolution)) return Response.json({ message: "กรุณาระบุสถานะและผลการตรวจสอบให้ถูกต้อง" }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<RowDataPacket[]>(`SELECT r.id,r.status,COALESCE(r.resolution,'') resolution,DATE_FORMAT(r.updated_at,'%Y-%m-%d %H:%i:%s') updatedAt,s.teacher_id teacherId FROM attendance_issue_reports r LEFT JOIN subjects s ON s.id=r.subject_id WHERE r.id=? FOR UPDATE`, [id]);
    if (!rows[0] || (teacher && rows[0].teacherId !== teacher.id)) {
      await connection.rollback();
      return Response.json({ message: "ไม่พบคำร้องที่คุณมีสิทธิ์ตรวจสอบ" }, { status: 404 });
    }
    if (rows[0].status !== body.expectedStatus || rows[0].updatedAt !== body.expectedUpdatedAt || rows[0].resolution !== body.expectedResolution) {
      await connection.rollback();
      return Response.json({ message: "คำร้องถูกปรับปรุงแล้ว กรุณาโหลดข้อมูลล่าสุด" }, { status: 409 });
    }
    await connection.execute("UPDATE attendance_issue_reports SET status=?,resolution=?,updated_at=CURRENT_TIMESTAMP WHERE id=?", [status, resolution || null, id]);
    await connection.execute("INSERT INTO audit_logs(user_id,action,entity,entity_id,description,ip_address,user_agent) VALUES(?,?,?,?,?,?,?)", [admin?.id || teacher!.id, "UPDATE", "attendance_issue", String(id), `${admin ? "Admin" : "ครู"} ตรวจคำร้อง: ${rows[0].status} → ${status}`, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null, request.headers.get("user-agent")?.slice(0, 255) || null]);
    await connection.commit();
    // Student notifications are derived from this same report by the existing
    // syncStudentNotificationEvents, avoiding a duplicate notification source.
    return Response.json({ message: "บันทึกผลตรวจสอบสำเร็จ" });
  } catch {
    await connection.rollback();
    return Response.json({ message: "บันทึกผลตรวจสอบไม่สำเร็จ" }, { status: 500 });
  } finally { connection.release(); }
}
