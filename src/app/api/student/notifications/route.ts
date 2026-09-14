import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
import { notificationPagination, notificationReadCommand } from "@/lib/student-notification-rules.mjs";
import {
  getStudentNotifications,
  markNotificationAsRead,
} from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const student = await getStudentSession();
  if (!student) {
    return NextResponse.json({ message: "กรุณาเข้าสู่ระบบนักเรียน" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pagination = notificationPagination(searchParams);
  if (!pagination)
    return NextResponse.json({ message: 'เลขหน้าไม่ถูกต้อง' }, { status: 400 });

  const result = await getStudentNotifications(student.id, pagination.limit, pagination.page);
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const student = await getStudentSession();
  if (!student) {
    return NextResponse.json({ message: "กรุณาเข้าสู่ระบบนักเรียน" }, { status: 401 });
  }

  const command = notificationReadCommand(await request.json().catch(() => null));
  if (!command)
    return NextResponse.json({ message: 'กรุณาระบุรายการแจ้งเตือน' }, { status: 400 });
  await markNotificationAsRead(student.id, command.all ? undefined : command.id);

  return NextResponse.json({ ok: true, message: "อัปเดตสถานะการแจ้งเตือนแล้ว" });
}
