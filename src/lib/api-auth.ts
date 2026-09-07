import { NextResponse } from "next/server";
import { getTeacherSession } from "./auth";
import { prisma } from "./prisma";
export async function requireTeacher() {
  const session = await getTeacherSession();
  if (!session)
    return {
      error: NextResponse.json(
        { message: "ไม่มีสิทธิ์ใช้งาน" },
        { status: 401 },
      ),
    };
  const teacher = await prisma.teacher.findUnique({
    where: { id: session.id },
    select: { id: true, status: true },
  });
  if (!teacher || teacher.status !== "ACTIVE")
    return {
      error: NextResponse.json({ message: "ไม่พบบัญชีครู" }, { status: 403 }),
    };
  return { session, teacher };
}
export function requestMeta(request: Request) {
  return {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: request.headers.get("user-agent")?.slice(0, 255),
  };
}
