import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getAdminSession } from "@/lib/auth";
import { protectTeacherMutation } from "@/lib/api-security";
import { db } from "@/lib/db";
import { getAdminSubjectRequests, parseSubjectRequestInput } from "@/lib/subject-requests";

export const runtime = "nodejs";
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  return NextResponse.json({ requests: await getAdminSubjectRequests() });
}
export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const protection = protectTeacherMutation(request, admin.id, "admin-subject-request", 30);
  if (protection) return protection;
  const body = await request.json().catch(() => null);
  const requestId = Number(body?.requestId);
  const action = body?.action;
  const remark = typeof body?.remark === "string" ? body.remark.trim() : "";
  if (!Number.isSafeInteger(requestId) || requestId < 1 || !["APPROVE", "REJECT", "REQUEST_CHANGES"].includes(action)) return NextResponse.json({ message: "ข้อมูลคำขอไม่ถูกต้อง" }, { status: 400 });
  if (remark.length > 500 || (action !== "APPROVE" && !remark)) return NextResponse.json({ message: "กรุณาระบุความเห็นไม่เกิน 500 ตัวอักษร" }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { teacherId: number; classroomId: number; subjectName: string; subjectCode: string; semester: number; academicYear: string; description: string | null; schedulesJson: string; status: string })[]>("SELECT teacher_id teacherId,classroom_id classroomId,subject_name subjectName,subject_code subjectCode,semester,academic_year academicYear,description,schedules_json schedulesJson,status FROM teacher_subject_requests WHERE id=? FOR UPDATE", [requestId]);
    const row = rows[0];
    if (!row) { await connection.rollback(); return NextResponse.json({ message: "ไม่พบคำขอ" }, { status: 404 }); }
    if (row.status !== "PENDING") { await connection.rollback(); return NextResponse.json({ message: "คำขอนี้ได้รับการดำเนินการแล้ว" }, { status: 409 }); }
    let status = "REJECTED";
    let subjectId: number | null = null;
    if (action === "APPROVE") {
      let input;
      try { input = parseSubjectRequestInput({ ...row, schedules: typeof row.schedulesJson === "string" ? JSON.parse(row.schedulesJson) : row.schedulesJson }); }
      catch { await connection.rollback(); return NextResponse.json({ message: "ข้อมูลรายวิชาไม่สมบูรณ์ กรุณาขอให้ครูแก้ไข" }, { status: 409 }); }
      const [classrooms] = await connection.execute<(RowDataPacket & { level: string })[]>("SELECT level FROM classrooms WHERE id=?", [input.classroomId]);
      if (!classrooms[0]) { await connection.rollback(); return NextResponse.json({ message: "ห้องเรียนนี้ไม่มีในระบบแล้ว" }, { status: 409 }); }
      const [existing] = await connection.execute<RowDataPacket[]>("SELECT id FROM subjects WHERE subject_code=? LIMIT 1", [input.subjectCode]);
      if (existing.length) { await connection.rollback(); return NextResponse.json({ message: "รหัสวิชานี้ถูกใช้งานแล้ว กรุณาขอให้ครูแก้ไข" }, { status: 409 }); }
      const first = input.schedules[0];
      const [created] = await connection.execute<ResultSetHeader>("INSERT INTO subjects (subject_code,subject_name,teacher_id,grade_level,classroom_id,semester,academic_year,credits,study_days,start_time,end_time,attendance_mode,is_active,description) VALUES (?,?,?,?,?,?,?,1.0,?,?,?,'EVERY_PERIOD',1,?)", [input.subjectCode, input.subjectName, row.teacherId, classrooms[0].level, input.classroomId, input.semester, input.academicYear, input.schedules.map((s) => s.dayOfWeek).join(","), first.startTime, first.endTime, input.description || null]);
      subjectId = created.insertId;
      for (const schedule of input.schedules) await connection.execute("INSERT INTO schedules (subject_id,classroom_id,day_of_week,period_name,start_time,end_time,is_active) VALUES (?,?,?,?,?,?,1)", [subjectId, input.classroomId, schedule.dayOfWeek, schedule.periodName || null, schedule.startTime, schedule.endTime]);
      status = "APPROVED";
    } else if (action === "REQUEST_CHANGES") status = "CHANGES_REQUESTED";
    await connection.execute("UPDATE teacher_subject_requests SET status=?,admin_remark=?,reviewed_by_admin_id=?,reviewed_at=CURRENT_TIMESTAMP,subject_id=? WHERE id=?", [status, remark || null, admin.id, subjectId, requestId]);
    await connection.execute("INSERT INTO teacher_notifications (teacher_id,title,message,href,type) VALUES (?,?,?,?,?)", [row.teacherId, status === "APPROVED" ? "คำขอรายวิชาได้รับอนุมัติ" : status === "CHANGES_REQUESTED" ? "กรุณาแก้ไขคำขอรายวิชา" : "คำขอรายวิชาไม่ได้รับอนุมัติ", `${row.subjectCode} ${row.subjectName}${remark ? ` · ${remark}` : ""}`.slice(0, 500), "/teacher/subject-requests", "INFO"]);
    await connection.commit();
    return NextResponse.json({ message: status === "APPROVED" ? "อนุมัติรายวิชาแล้ว" : "บันทึกผลการพิจารณาแล้ว" });
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return NextResponse.json({ message: "รหัสวิชาหรือเวลาเรียนนี้ถูกใช้งานแล้ว กรุณาตรวจสอบคำขอ" }, { status: 409 });
    console.error("Unable to review teacher subject request", error);
    return NextResponse.json({ message: "พิจารณาคำขอไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  } finally { connection.release(); }
}
