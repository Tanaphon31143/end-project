import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireTeacher, requestMeta } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const asDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const asTime = (value: string) => new Date(`1970-01-01T${value}:00.000Z`);

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  const subjectId = Number(body.subjectId ?? body.courseId);
  const sessionDate = String(body.sessionDate ?? "");
  const startTime = String(body.startTime ?? "");
  const endTime = String(body.endTime ?? "");
  const lateMinutes = Number(body.lateMinutes);
  if (
    !Number.isInteger(subjectId) ||
    !DATE.test(sessionDate) ||
    !TIME.test(startTime) ||
    !TIME.test(endTime) ||
    endTime <= startTime ||
    !Number.isInteger(lateMinutes) ||
    lateMinutes < 0 ||
    lateMinutes > 120
  ) {
    return NextResponse.json(
      { message: "ข้อมูลรอบเช็คชื่อไม่ถูกต้อง" },
      { status: 400 },
    );
  }
  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      teacherId: auth.teacher.id,
      isActive: true,
      classroomId: { not: null },
    },
  });
  if (!subject?.classroomId)
    return NextResponse.json(
      { message: "ไม่พบรายวิชาหรือไม่มีสิทธิ์" },
      { status: 403 },
    );
  const lateAfter = asTime(startTime);
  lateAfter.setUTCMinutes(lateAfter.getUTCMinutes() + lateMinutes);
  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const session = await tx.checkInSession.create({
          data: {
            subjectId,
            classroomId: subject.classroomId!,
            sessionDate: asDate(sessionDate),
            startTime: asTime(startTime),
            endTime: asTime(endTime),
            lateAfter,
            status: "ACTIVE",
            createdByTeacherId: auth.teacher.id,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: auth.teacher.id,
            action: "CREATE",
            entity: "check_in_session",
            entityId: String(session.id),
            description: `สร้างรอบเช็คชื่อ ${subject.subjectCode}`,
            ...requestMeta(request),
          },
        });
        return session;
      },
    );
    return NextResponse.json(
      { ...result, id: String(result.id) },
      { status: 201 },
    );
  } catch (error) {
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
