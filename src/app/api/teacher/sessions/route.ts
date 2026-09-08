import type { Prisma } from "@prisma/client";
import type { RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { requireTeacher, requestMeta } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { protectTeacherMutation } from "@/lib/api-security";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const asTime = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const blocked = protectTeacherMutation(
    request,
    auth.teacher.id,
    "session-create",
    10,
  );
  if (blocked) return blocked;
  const body = await request.json();
  const subjectId = Number(body.subjectId ?? body.courseId);
  const scheduleId = Number(body.scheduleId);
  const sessionDate = String(body.sessionDate ?? "");
  const lateMinutes = Number(body.lateMinutes);
  if (
    !Number.isInteger(subjectId) ||
    !Number.isInteger(scheduleId) ||
    !DATE.test(sessionDate) ||
    !Number.isInteger(lateMinutes) ||
    lateMinutes < 0 ||
    lateMinutes > 120
  ) {
    return NextResponse.json(
      { message: "ข้อมูลรอบเช็คชื่อไม่ถูกต้อง" },
      { status: 400 },
    );
  }
  type ScheduleRow = RowDataPacket & {
    id: number;
    subjectId: number;
    classroomId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    subjectCode: string;
  };
  const [scheduleRows] = await db.execute<ScheduleRow[]>(
    `SELECT sc.id,sc.subject_id subjectId,sc.classroom_id classroomId,sc.day_of_week dayOfWeek,TIME_FORMAT(sc.start_time,'%H:%i') startTime,TIME_FORMAT(sc.end_time,'%H:%i') endTime,sb.subject_code subjectCode FROM schedules sc JOIN subjects sb ON sb.id=sc.subject_id WHERE sc.id=? AND sc.subject_id=? AND sc.is_active=1 AND sb.is_active=1 AND sb.teacher_id=? LIMIT 1`,
    [scheduleId, subjectId, auth.teacher.id],
  );
  const schedule = scheduleRows[0];
  if (!schedule)
    return NextResponse.json(
      { message: "ไม่พบคาบเรียน รายวิชา หรือไม่มีสิทธิ์" },
      { status: 403 },
    );
  const selectedDay = asDate(sessionDate).getUTCDay() || 7;
  if (selectedDay !== schedule.dayOfWeek)
    return NextResponse.json(
      { message: `วันที่เลือกไม่ตรงกับวันเรียนของคาบนี้` },
      { status: 400 },
    );
  const startTime = schedule.startTime;
  const endTime = schedule.endTime;
  if (!TIME.test(startTime) || !TIME.test(endTime) || endTime <= startTime)
    return NextResponse.json(
      { message: "เวลาของคาบเรียนไม่ถูกต้อง" },
      { status: 400 },
    );
  const lateAfter = asTime(startTime);
  lateAfter.setUTCMinutes(lateAfter.getUTCMinutes() + lateMinutes);
  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        await tx.$queryRaw`SELECT id FROM classrooms WHERE id=${schedule.classroomId} FOR UPDATE`;
        const overlap = await tx.checkInSession.findFirst({
          where: {
            sessionDate: asDate(sessionDate),
            classroomId: schedule.classroomId,
            startTime: { lt: asTime(endTime) },
            endTime: { gt: asTime(startTime) },
          },
          select: { id: true },
        });
        if (overlap) throw new Error("SESSION_OVERLAP");
        const session = await tx.checkInSession.create({
          data: {
            subjectId,
            classroomId: schedule.classroomId,
            sessionDate: asDate(sessionDate),
            startTime: asTime(startTime),
            endTime: asTime(endTime),
            lateAfter,
            status: "ACTIVE",
            createdByTeacherId: auth.teacher.id,
          },
        });
        await tx.$executeRaw`UPDATE check_in_sessions SET schedule_id=${scheduleId} WHERE id=${session.id}`;
        await tx.auditLog.create({
          data: {
            userId: auth.teacher.id,
            action: "CREATE",
            entity: "check_in_session",
            entityId: String(session.id),
            description: `สร้างรอบเช็คชื่อ ${schedule.subjectCode} จากตารางเรียน ${scheduleId}`,
            ...requestMeta(request),
          },
        });
        await tx.$executeRaw`INSERT INTO teacher_notifications(teacher_id,title,message,href,type) VALUES(${auth.teacher.id},${"สร้างรอบเช็คชื่อสำเร็จ"},${`${schedule.subjectCode} วันที่ ${sessionDate} เวลา ${startTime}–${endTime} น.`},${`/teacher/scan/${session.id}`},${"SESSION"})`;
        return session;
      },
    );
    return NextResponse.json(
      { ...result, id: String(result.id) },
      { status: 201 },
    );
  } catch (error) {
    if ((error as Error).message === "SESSION_OVERLAP")
      return NextResponse.json(
        { message: "มีรอบเช็คชื่อที่ใช้ห้องและช่วงเวลานี้อยู่แล้ว" },
        { status: 409 },
      );
    if ((error as { code?: string }).code === "P2002")
      return NextResponse.json(
        { message: "รอบเช็คชื่อนี้มีอยู่แล้ว" },
        { status: 409 },
      );
    console.error("Create teacher session failed", error);
    return NextResponse.json(
      { message: "ไม่สามารถสร้างรอบเช็คชื่อได้" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const blocked = protectTeacherMutation(
    request,
    auth.teacher.id,
    "session-close",
    10,
  );
  if (blocked) return blocked;
  const body = await request.json();
  let sessionId: bigint;
  try {
    sessionId = BigInt(body.sessionId);
  } catch {
    return NextResponse.json(
      { message: "รอบเช็คชื่อไม่ถูกต้อง" },
      { status: 400 },
    );
  }
  const session = await prisma.checkInSession.findFirst({
    where: {
      id: sessionId,
      status: "ACTIVE",
      subject: { teacherId: auth.teacher.id },
    },
    include: { subject: true },
  });
  if (!session)
    return NextResponse.json(
      { message: "ไม่พบรอบที่เปิดอยู่หรือไม่มีสิทธิ์" },
      { status: 404 },
    );
  const students = await prisma.student.findMany({
    where: { classId: session.classroomId, status: "ACTIVE" },
    select: { id: true },
  });
  let alreadyClosed = false;
  let absentCreated = 0;
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const claimed = await tx.checkInSession.updateMany({
      where: { id: session.id, status: "ACTIVE" },
      data: { status: "CLOSED" },
    });
    if (!claimed.count) {
      alreadyClosed = true;
      return;
    }
    const existing = await tx.attendanceRecord.findMany({
      where: {
        checkInSessionId: session.id,
        studentId: { in: students.map((student) => student.id) },
      },
      select: { studentId: true },
    });
    const checked = new Set(existing.map((item) => item.studentId));
    const missing = students.filter((student) => !checked.has(student.id));
    absentCreated = missing.length;
    for (const student of missing) {
      const record = await tx.attendanceRecord.create({
        data: {
          studentId: student.id,
          subjectId: session.subjectId,
          attendanceDate: session.sessionDate,
          status: "ABSENT",
          checkInSessionId: session.id,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.teacher.id,
          action: "CREATE",
          entity: "attendance_record",
          entityId: String(record.id),
          description: `ปิดรอบและบันทึกขาดเรียน นักเรียน ${student.id}`,
          ...requestMeta(request),
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: auth.teacher.id,
        action: "CLOSE",
        entity: "check_in_session",
        entityId: String(session.id),
        description: `ปิดรอบเช็คชื่อ ${session.subject.subjectCode} และบันทึกขาดเรียน ${absentCreated} คน`,
        ...requestMeta(request),
      },
    });
    await tx.$executeRaw`INSERT INTO teacher_notifications(teacher_id,title,message,href,type) VALUES(${auth.teacher.id},${"ปิดรอบเช็คชื่อแล้ว"},${`${session.subject.subjectCode} บันทึกขาดเรียน ${absentCreated} คน`},${`/teacher/history/${session.id}`},${"SESSION"})`;
  });
  if (alreadyClosed)
    return NextResponse.json(
      { message: "รอบเช็คชื่อนี้ถูกปิดแล้ว" },
      { status: 409 },
    );
  return NextResponse.json({ message: "ปิดรอบเช็คชื่อแล้ว", absentCreated });
}
