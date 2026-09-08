import type { AttendanceStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireTeacher, requestMeta } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { attendanceStatus } from "@/lib/teacher-rules.mjs";
import { protectTeacherMutation } from "@/lib/api-security";

const STATUSES: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "LEAVE"];
const today = () => new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())}T00:00:00.000Z`);

function isPastLateTime(lateAfter: Date) {
  const bangkokTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [hour, minute] = bangkokTime.split(":").map(Number);
  return attendanceStatus(hour * 60 + minute, lateAfter.getUTCHours() * 60 + lateAfter.getUTCMinutes()) === "LATE";
}

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const blocked = protectTeacherMutation(request, auth.teacher.id, "attendance-create", 20);
  if (blocked) return blocked;
  const body = await request.json();
  const studentId = Number(body.studentId);
  let sessionId: bigint;
  try {
    sessionId = BigInt(body.sessionId);
  } catch {
    return NextResponse.json(
      { message: "รอบเช็คชื่อไม่ถูกต้อง" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(studentId) || studentId < 1)
    return NextResponse.json(
      { message: "ไม่พบข้อมูลนักเรียน ระบบจะไม่บันทึกการเช็คชื่อ" },
      { status: 422 },
    );
  const session = await prisma.checkInSession.findFirst({
    where: {
      id: sessionId,
      status: "ACTIVE",
      sessionDate: today(),
      subject: { teacherId: auth.teacher.id },
    },
  });
  if (!session)
    return NextResponse.json(
      { message: "ไม่พบรอบเช็คชื่อหรือไม่มีสิทธิ์" },
      { status: 403 },
    );
  const student = await prisma.student.findFirst({
    where: { id: studentId, classId: session.classroomId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!student)
    return NextResponse.json(
      { message: "นักเรียนไม่อยู่ในห้องเรียนของรายวิชานี้" },
      { status: 422 },
    );
  const requested = String(body.status) as AttendanceStatus;
  const status: AttendanceStatus = STATUSES.includes(requested)
    ? requested
    : isPastLateTime(session.lateAfter)
      ? "LATE"
      : "PRESENT";
  const confidence = Number(body.confidence);
  const existing = await prisma.attendanceRecord.findFirst({where:{studentId,checkInSessionId:session.id},select:{id:true,status:true,checkInTime:true}});
  if(existing)return NextResponse.json({alreadyCheckedIn:true,message:"นักเรียนคนนี้เช็คชื่อแล้ว",record:{id:String(existing.id),status:existing.status,checkInTime:existing.checkInTime}},{status:409});
  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const locked = await tx.$queryRaw<Array<{ status: string }>>`SELECT status FROM check_in_sessions WHERE id=${session.id} FOR UPDATE`;
        if (locked[0]?.status !== "ACTIVE") throw new Error("SESSION_CLOSED");
        const record = await tx.attendanceRecord.create({ data: {
          studentId,
          subjectId: session.subjectId,
          attendanceDate: session.sessionDate,
          checkInTime: new Date(),
          status,
          confidence: Number.isFinite(confidence) ? confidence : null,
          checkInSessionId: session.id,
        }});
      await tx.auditLog.create({
        data: {
          userId: auth.teacher.id,
          action: "UPSERT",
          entity: "attendance_record",
          entityId: String(record.id),
          description: `บันทึกสถานะ ${status} ของนักเรียน ${studentId}`,
          ...requestMeta(request),
        },
      });
      return record;
      },
    );
    return NextResponse.json({ ...result, id: String(result.id), checkInSessionId: result.checkInSessionId ? String(result.checkInSessionId) : null });
  } catch(error) {
    if((error as Error).message==="SESSION_CLOSED")return NextResponse.json({message:"รอบเช็คชื่อนี้ปิดแล้ว ไม่สามารถบันทึกเพิ่มได้"},{status:409});
    if((error as{code?:string}).code==="P2002")return NextResponse.json({alreadyCheckedIn:true,message:"นักเรียนคนนี้เช็คชื่อแล้ว"},{status:409});
    throw error;
  }
}

export async function PATCH(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const blocked = protectTeacherMutation(request, auth.teacher.id, "attendance-update", 40);
  if (blocked) return blocked;
  const body = await request.json();
  const studentId = Number(body.studentId);
  const status = String(body.status) as AttendanceStatus;
  const reason = String(body.reason ?? "").trim();
  let sessionId: bigint;
  try { sessionId = BigInt(body.sessionId); } catch { return NextResponse.json({ message: "รอบเช็คชื่อไม่ถูกต้อง" }, { status: 400 }); }
  if (!Number.isInteger(studentId) || !STATUSES.includes(status) || reason.length < 3 || reason.length > 500)
    return NextResponse.json({ message: "กรุณาเลือกสถานะและระบุเหตุผลอย่างน้อย 3 ตัวอักษร" }, { status: 400 });
  const session = await prisma.checkInSession.findFirst({ where: { id: sessionId, subject: { teacherId: auth.teacher.id } } });
  if (!session) return NextResponse.json({ message: "ไม่พบรอบเช็คชื่อหรือไม่มีสิทธิ์" }, { status: 404 });
  const student = await prisma.student.findFirst({ where: { id: studentId, classId: session.classroomId, status: "ACTIVE" }, select: { id: true, fullName: true } });
  if (!student) return NextResponse.json({ message: "นักเรียนไม่อยู่ในรายวิชานี้" }, { status: 422 });
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.attendanceRecord.findFirst({ where: { studentId, checkInSessionId: session.id } });
    const checkInTime = status === "PRESENT" || status === "LATE" ? existing?.checkInTime ?? new Date() : null;
    const record = existing
      ? await tx.attendanceRecord.update({ where: { id: existing.id }, data: { status, checkInTime } })
      : await tx.attendanceRecord.create({ data: { studentId, subjectId: session.subjectId, attendanceDate: session.sessionDate, checkInSessionId: session.id, status, checkInTime } });
    await tx.auditLog.create({ data: { userId: auth.teacher.id, action: existing ? "STATUS_UPDATE" : "CREATE", entity: "attendance_record", entityId: String(record.id), description: `${existing?.status ?? "ยังไม่เช็คชื่อ"} → ${status}; เหตุผล: ${reason}; นักเรียน: ${student.fullName}`, ...requestMeta(request) } });
    return record;
  });
  return NextResponse.json({ message: "บันทึกสถานะเรียบร้อยแล้ว", record: { id: String(result.id), status: result.status, checkInTime: result.checkInTime } });
}

export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  let id: bigint;
  try {
    id = BigInt(new URL(request.url).searchParams.get("sessionId") ?? "");
  } catch {
    return NextResponse.json(
      { message: "รอบเช็คชื่อไม่ถูกต้อง" },
      { status: 400 },
    );
  }
  const session = await prisma.checkInSession.findFirst({
    where: { id, subject: { teacherId: auth.teacher.id } },
    include: {
      subject: { include: { classroom: true } },
      attendance: {
        include: { student: true },
        orderBy: { checkInTime: "desc" },
      },
    },
  });
  if (!session)
    return NextResponse.json({ message: "ไม่พบข้อมูล" }, { status: 404 });
  const totalStudents=await prisma.student.count({where:{classId:session.classroomId,status:"ACTIVE"}});
  return NextResponse.json({
    ...session,
    id: String(session.id),
    attendance: session.attendance.map((item) => ({
      ...item,
      id: String(item.id),
      checkInSessionId: item.checkInSessionId
        ? String(item.checkInSessionId)
        : null,
    })),
    totalStudents,
  });
}
