import type { AttendanceStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireTeacher, requestMeta } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const STATUSES: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "LEAVE"];

function isPastLateTime(lateAfter: Date) {
  const bangkokTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [hour, minute] = bangkokTime.split(":").map(Number);
  return (
    hour * 60 + minute >
    lateAfter.getUTCHours() * 60 + lateAfter.getUTCMinutes()
  );
}

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
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
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const record = await tx.attendanceRecord.upsert({
        where: {
          studentId_subjectId_attendanceDate: {
            studentId,
            subjectId: session.subjectId,
            attendanceDate: session.sessionDate,
          },
        },
        create: {
          studentId,
          subjectId: session.subjectId,
          attendanceDate: session.sessionDate,
          checkInTime: new Date(),
          status,
          confidence: Number.isFinite(confidence) ? confidence : null,
          checkInSessionId: session.id,
        },
        update: {
          checkInTime: new Date(),
          status,
          confidence: Number.isFinite(confidence) ? confidence : null,
          checkInSessionId: session.id,
        },
      });
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
  return NextResponse.json({
    ...result,
    id: String(result.id),
    checkInSessionId: result.checkInSessionId
      ? String(result.checkInSessionId)
      : null,
  });
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
      subject: true,
      attendance: {
        include: { student: true },
        orderBy: { checkInTime: "desc" },
      },
    },
  });
  if (!session)
    return NextResponse.json({ message: "ไม่พบข้อมูล" }, { status: 404 });
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
  });
}
