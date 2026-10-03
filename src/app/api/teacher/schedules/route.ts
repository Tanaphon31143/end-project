import { NextResponse } from "next/server";
import { requireTeacher, requestMeta } from "@/lib/api-auth";
import { protectTeacherMutation } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const timeValue = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const blocked = protectTeacherMutation(request, auth.teacher.id, "schedule-create", 12);
  if (blocked) return blocked;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const subjectId = Number(body?.subjectId);
  const dayOfWeek = Number(body?.dayOfWeek);
  const periodName = String(body?.periodName ?? "").trim();
  const startTime = String(body?.startTime ?? "");
  const endTime = String(body?.endTime ?? "");

  if (
    !Number.isSafeInteger(subjectId) || subjectId < 1 ||
    !Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7 ||
    periodName.length > 50 || !TIME.test(startTime) || !TIME.test(endTime) ||
    startTime >= endTime
  ) {
    return NextResponse.json({ message: "ข้อมูลตารางสอนไม่ถูกต้อง" }, { status: 400 });
  }

  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, teacherId: auth.teacher.id, isActive: true },
    select: { id: true, subjectCode: true, classroomId: true },
  });
  const classroomId = subject?.classroomId;
  if (!subject || classroomId === null || classroomId === undefined)
    return NextResponse.json({ message: "ไม่พบรายวิชาหรือไม่มีสิทธิ์เพิ่มตารางสอน" }, { status: 403 });

  try {
    const schedule = await prisma.$transaction(async (tx) => {
      const conflict = await tx.schedule.findFirst({
        where: {
          classroomId,
          dayOfWeek,
          isActive: true,
          startTime: { lt: timeValue(endTime) },
          endTime: { gt: timeValue(startTime) },
        },
        select: { id: true },
      });
      if (conflict) throw new Error("SCHEDULE_CONFLICT");

      const teacherConflict = await tx.schedule.findFirst({
        where: {
          subject: { teacherId: auth.teacher.id },
          dayOfWeek,
          isActive: true,
          startTime: { lt: timeValue(endTime) },
          endTime: { gt: timeValue(startTime) },
        },
        select: { id: true },
      });
      if (teacherConflict) throw new Error("TEACHER_SCHEDULE_CONFLICT");

      const created = await tx.schedule.create({
        data: {
          subjectId: subject.id,
          classroomId,
          dayOfWeek,
          periodName: periodName || null,
          startTime: timeValue(startTime),
          endTime: timeValue(endTime),
          isActive: true,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: auth.teacher.id,
          action: "CREATE",
          entity: "schedule",
          entityId: String(created.id),
          description: `เพิ่มตารางสอน ${subject.subjectCode} วันที่ ${dayOfWeek} เวลา ${startTime}–${endTime}`,
          ...requestMeta(request),
        },
      });
      return created;
    });
    return NextResponse.json({ id: schedule.id }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "SCHEDULE_CONFLICT")
      return NextResponse.json({ message: "ห้องเรียนมีคาบสอนซ้อนในวันและเวลานี้" }, { status: 409 });
    if ((error as Error).message === "TEACHER_SCHEDULE_CONFLICT")
      return NextResponse.json({ message: "คุณมีตารางสอนซ้อนในวันและเวลานี้" }, { status: 409 });
    if ((error as { code?: string }).code === "P2002")
      return NextResponse.json({ message: "รายวิชานี้มีคาบสอนช่วงเวลานี้แล้ว" }, { status: 409 });
    console.error("Create teacher schedule failed", error);
    return NextResponse.json({ message: "ไม่สามารถเพิ่มตารางสอนได้" }, { status: 500 });
  }
}
