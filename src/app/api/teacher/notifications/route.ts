import { NextResponse } from "next/server";
import { protectTeacherMutation } from "@/lib/api-security";
import { requireTeacher, requestMeta } from "@/lib/api-auth";
import { getTeacherNotifications } from "@/lib/teacher-data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  return NextResponse.json({
    notifications: await getTeacherNotifications(auth.teacher.id),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const blocked = protectTeacherMutation(
    request,
    auth.teacher.id,
    "notifications-read",
    20,
  );
  if (blocked) return blocked;
  const body = await request.json().catch(() => ({}));
  await prisma.$transaction(async (transaction) => {
    if (body.id)
      await transaction.$executeRaw`UPDATE teacher_notifications SET is_read=1 WHERE id=${String(body.id)} AND teacher_id=${auth.teacher.id}`;
    else
      await transaction.$executeRaw`UPDATE teacher_notifications SET is_read=1 WHERE teacher_id=${auth.teacher.id} AND is_read=0`;
    await transaction.auditLog.create({
      data: {
        userId: auth.teacher.id,
        action: "MARK_READ",
        entity: "teacher_notification",
        entityId: body.id ? String(body.id) : "all",
        description: body.id ? "อ่านการแจ้งเตือน" : "อ่านการแจ้งเตือนทั้งหมด",
        ...requestMeta(request),
      },
    });
  });
  return NextResponse.json({ ok: true });
}
