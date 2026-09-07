import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { AttendanceAudit, AttendanceRecord, AttendanceStatus } from "@/components/admin/attendance/types";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const STATUSES: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "LEAVE"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function isStatus(value: unknown): value is AttendanceStatus {
  return STATUSES.includes(value as AttendanceStatus);
}

const recordSelect = `SELECT a.id,a.student_id studentId,st.student_code studentCode,st.full_name studentName,
  st.class_id classroomId,COALESCE(c.name,'ยังไม่ระบุ') className,a.subject_id subjectId,
  COALESCE(sb.subject_code,'-') subjectCode,COALESCE(sb.subject_name,'ไม่ระบุรายวิชา') subjectName,
  DATE_FORMAT(a.attendance_date,'%Y-%m-%d') attendanceDate,
  IFNULL(TIME_FORMAT(a.check_in_time,'%H:%i:%s'),NULL) checkInTime,a.status,
  IFNULL(CAST(a.confidence AS DECIMAL(5,2)),NULL) confidence,
  DATE_FORMAT(a.created_at,'%d/%m/%Y %H:%i') createdAt
  FROM attendance_records a JOIN students st ON st.id=a.student_id
  LEFT JOIN classrooms c ON c.id=st.class_id LEFT JOIN subjects sb ON sb.id=a.subject_id`;

export async function GET(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const recordId = Number(params.get("recordId"));

  if (recordId) {
    const [records] = await db.execute<(RowDataPacket & AttendanceRecord)[]>(`${recordSelect} WHERE a.id=?`, [recordId]);
    if (!records[0]) return Response.json({ message: "ไม่พบรายการเข้าเรียน" }, { status: 404 });
    const [audits] = await db.execute<(RowDataPacket & AttendanceAudit)[]>(`SELECT aa.id,aa.action,COALESCE(ad.full_name,'ผู้ดูแลระบบ') adminName,aa.old_status oldStatus,aa.new_status newStatus,COALESCE(aa.note,'') note,DATE_FORMAT(aa.created_at,'%d/%m/%Y %H:%i:%s') createdAt FROM attendance_record_audits aa LEFT JOIN admins ad ON ad.id=aa.admin_id WHERE aa.attendance_record_id=? ORDER BY aa.created_at DESC,aa.id DESC`, [recordId]);
    return Response.json({ record: records[0], audits });
  }

  const where: string[] = [];
  const values: (string | number)[] = [];
  const search = (params.get("search") || "").trim();
  const date = params.get("date") || "";
  const subjectId = Number(params.get("subjectId"));
  const classroomId = Number(params.get("classroomId"));
  const status = params.get("status") || "";
  if (search) { where.push("(st.student_code LIKE ? OR st.full_name LIKE ?)"); values.push(`%${search}%`, `%${search}%`); }
  if (datePattern.test(date)) { where.push("a.attendance_date=?"); values.push(date); }
  if (subjectId > 0) { where.push("a.subject_id=?"); values.push(subjectId); }
  if (classroomId > 0) { where.push("st.class_id=?"); values.push(classroomId); }
  if (isStatus(status)) { where.push("a.status=?"); values.push(status); }
  const sql = `${recordSelect}${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY a.attendance_date DESC,a.check_in_time DESC,a.id DESC LIMIT 500`;
  const [records] = await db.execute<(RowDataPacket & AttendanceRecord)[]>(sql, values);
  return Response.json({ records });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const studentId = Number(body.studentId), subjectId = Number(body.subjectId);
  const attendanceDate = String(body.attendanceDate || ""), checkInTime = String(body.checkInTime || "");
  const status = body.status, note = String(body.note || "").trim().slice(0, 500);
  if (!Number.isInteger(studentId) || studentId < 1 || !Number.isInteger(subjectId) || subjectId < 1 || !datePattern.test(attendanceDate) || !isStatus(status)) {
    return Response.json({ message: "กรุณากรอกข้อมูลการเข้าเรียนให้ครบถ้วน" }, { status: 400 });
  }
  if ((status === "PRESENT" || status === "LATE") && !timePattern.test(checkInTime)) {
    return Response.json({ message: "กรุณาระบุเวลาเข้าเรียนให้ถูกต้อง" }, { status: 400 });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [relations] = await connection.execute<(RowDataPacket & { studentId: number; studentClassId: number | null; subjectClassId: number | null })[]>(`SELECT st.id studentId,st.class_id studentClassId,sb.classroom_id subjectClassId FROM students st CROSS JOIN subjects sb WHERE st.id=? AND sb.id=? AND st.status='ACTIVE'`, [studentId, subjectId]);
    const relation = relations[0];
    if (!relation) { await connection.rollback(); return Response.json({ message: "ไม่พบนักเรียนหรือรายวิชาที่เลือก" }, { status: 404 }); }
    if (relation.subjectClassId && relation.studentClassId !== relation.subjectClassId) { await connection.rollback(); return Response.json({ message: "นักเรียนไม่ได้อยู่ในห้องของรายวิชานี้" }, { status: 400 }); }
    const dateTime = status === "PRESENT" || status === "LATE" ? `${attendanceDate} ${checkInTime}:00` : null;
    const [result] = await connection.execute<ResultSetHeader>("INSERT INTO attendance_records(student_id,subject_id,attendance_date,check_in_time,status,confidence) VALUES(?,?,?,?,?,NULL)", [studentId, subjectId, attendanceDate, dateTime, status]);
    await connection.execute("INSERT INTO attendance_record_audits(attendance_record_id,admin_id,action,old_status,new_status,note) VALUES(?,?,'ADD',NULL,?,?)", [result.insertId, admin.id, status, note || null]);
    await connection.commit();
    return Response.json({ id: result.insertId, message: "เพิ่มข้อมูลการเข้าเรียนแล้ว" }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return Response.json({ message: "นักเรียนมีข้อมูลในรายวิชาและวันที่นี้แล้ว" }, { status: 409 });
    console.error("Create attendance failed", error);
    return Response.json({ message: "ไม่สามารถเพิ่มข้อมูลการเข้าเรียนได้" }, { status: 500 });
  } finally { connection.release(); }
}

export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const id = Number(body.id), status = body.status, note = String(body.note || "").trim().slice(0, 500);
  if (!Number.isInteger(id) || id < 1 || !isStatus(status)) return Response.json({ message: "ข้อมูลสถานะไม่ถูกต้อง" }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [records] = await connection.execute<(RowDataPacket & { status: AttendanceStatus })[]>("SELECT status FROM attendance_records WHERE id=? FOR UPDATE", [id]);
    const oldStatus = records[0]?.status;
    if (!oldStatus) { await connection.rollback(); return Response.json({ message: "ไม่พบรายการเข้าเรียน" }, { status: 404 }); }
    if (oldStatus === status) { await connection.rollback(); return Response.json({ message: "สถานะไม่มีการเปลี่ยนแปลง" }); }
    await connection.execute("UPDATE attendance_records SET status=? WHERE id=?", [status, id]);
    await connection.execute("INSERT INTO attendance_record_audits(attendance_record_id,admin_id,action,old_status,new_status,note) VALUES(?,?,'STATUS_UPDATE',?,?,?)", [id, admin.id, oldStatus, status, note || null]);
    await connection.commit();
    return Response.json({ message: "แก้ไขสถานะและบันทึกประวัติแล้ว" });
  } catch (error) {
    await connection.rollback();
    console.error("Update attendance failed", error);
    return Response.json({ message: "ไม่สามารถแก้ไขสถานะได้" }, { status: 500 });
  } finally { connection.release(); }
}
