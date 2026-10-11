import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getCheckInPageData } from "@/lib/admin-data";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
type Body = {
  id?: unknown;
  subjectId?: unknown;
  classroomId?: unknown;
  sessionDate?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  lateMinutes?: unknown;
  status?: unknown;
};
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(":").map(Number),
    total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export async function GET(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const date =
    new URL(request.url).searchParams.get("date") ||
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!validDate(date))
    return Response.json({ message: "วันที่ไม่ถูกต้อง" }, { status: 400 });
  return Response.json(await getCheckInPageData(date));
}
export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin)
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = (await request.json()) as Body,
    subjectId = Number(body.subjectId),
    classroomId = Number(body.classroomId),
    sessionDate = String(body.sessionDate || ""),
    startTime = String(body.startTime || ""),
    endTime = String(body.endTime || ""),
    lateMinutes = Number(body.lateMinutes);
  if (
    !subjectId ||
    !classroomId ||
    !validDate(sessionDate) ||
    !validTime(startTime) ||
    !validTime(endTime) ||
    endTime <= startTime ||
    !Number.isInteger(lateMinutes) ||
    lateMinutes < 0 ||
    lateMinutes > 120
  )
    return Response.json(
      { message: "กรุณากรอกข้อมูลรอบเช็คชื่อให้ถูกต้อง" },
      { status: 400 },
    );
  const [subjects] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM subjects WHERE id=? AND classroom_id=? AND is_active=1",
    [subjectId, classroomId],
  );
  if (!subjects.length)
    return Response.json(
      { message: "รายวิชาไม่ตรงกับห้องเรียนหรือถูกปิดใช้งาน" },
      { status: 400 },
    );
  try {
    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO check_in_sessions(subject_id,classroom_id,session_date,start_time,end_time,late_after,status,created_by_admin_id) VALUES(?,?,?,?,?,?,'ACTIVE',?)",
      [
        subjectId,
        classroomId,
        sessionDate,
        startTime,
        endTime,
        addMinutes(startTime, lateMinutes),
        admin.id,
      ],
    );
    return Response.json(
      { id: result.insertId, message: "เปิดรอบเช็คชื่อสำเร็จ" },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY")
      return Response.json(
        { message: "รอบเช็คชื่อนี้มีอยู่แล้ว" },
        { status: 409 },
      );
    console.error("Create check-in session failed", error);
    return Response.json(
      { message: "ไม่สามารถเปิดรอบเช็คชื่อได้" },
      { status: 500 },
    );
  }
}
export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  if (!admin)
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = (await request.json()) as Body,
    id = Number(body.id),
    status =
      body.status === "ACTIVE"
        ? "ACTIVE"
        : body.status === "CLOSED"
          ? "CLOSED"
          : null;
  if (!Number.isInteger(id) || id < 1 || !status)
    return Response.json(
      { message: "ข้อมูลรอบเช็คชื่อไม่ถูกต้อง" },
      { status: 400 },
    );
  try {
    const result = await prisma.$transaction(async tx => {
      const session = await tx.checkInSession.findUnique({ where: { id: BigInt(id) } });
      if (!session) return null;
      // Claim the transition once. Both staff roles use the same session and
      // attendance tables; repeated closes must not create duplicate absences.
      const claimed = await tx.checkInSession.updateMany({
        where: { id: session.id, status: status === "CLOSED" ? "ACTIVE" : "CLOSED" },
        data: { status },
      });
      if (!claimed.count) return { absentCreated: 0 };
      let absentCreated = 0;
      if (status === "CLOSED") {
        const students = await tx.student.findMany({
          where: { classId: session.classroomId, status: "ACTIVE" }, select: { id: true },
        });
        const existing = await tx.attendanceRecord.findMany({
          where: { checkInSessionId: session.id }, select: { studentId: true },
        });
        const checked = new Set(existing.map(record => record.studentId));
        const missing = students.filter(student => !checked.has(student.id));
        absentCreated = missing.length;
        if (missing.length) await tx.attendanceRecord.createMany({
          data: missing.map(student => ({ studentId: student.id, subjectId: session.subjectId,
            attendanceDate: session.sessionDate, status: "ABSENT", checkInSessionId: session.id })),
        });
      }
      await tx.auditLog.create({ data: {
        userId: admin.id, action: status === "CLOSED" ? "CLOSE" : "OPEN", entity: "check_in_session",
        entityId: String(id), description: `Admin ${status === "CLOSED" ? "ปิด" : "เปิด"}รอบเช็คชื่อ บันทึกขาดเรียน ${absentCreated} คน`,
      } });
      return { absentCreated };
    }, { maxWait: 10_000, timeout: 30_000 });
    if (!result) return Response.json({ message: "ไม่พบรอบเช็คชื่อ" }, { status: 404 });
    return Response.json({ message: status === "CLOSED" ? "ปิดรอบเช็คชื่อแล้ว" : "เปิดรอบเช็คชื่อแล้ว", ...result });
  } catch {
    return Response.json({ message: "เปลี่ยนสถานะรอบไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
