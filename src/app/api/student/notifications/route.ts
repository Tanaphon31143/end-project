import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/auth";
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
  const limit = Number(searchParams.get('limit')) || 20;
  const page = Number(searchParams.get('page')) || 1;

  const result = await getStudentNotifications(student.id, limit, page);
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const student = await getStudentSession();
  if (!student) {
    return NextResponse.json({ message: "กรุณาเข้าสู่ระบบนักเรียน" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: number | string;
    markAll?: boolean;
  };

  const notificationId = body.id ? Number(body.id) : undefined;
  await markNotificationAsRead(student.id, notificationId);

  return NextResponse.json({ ok: true, message: "อัปเดตสถานะการแจ้งเตือนแล้ว" });
}
