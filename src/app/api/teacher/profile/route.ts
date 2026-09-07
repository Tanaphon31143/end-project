import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireTeacher, requestMeta } from "@/lib/api-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const body = await request.json();
  const teacher = await prisma.teacher.findUnique({
    where: { id: auth.teacher.id },
  });
  if (!teacher)
    return NextResponse.json({ message: "ไม่พบบัญชีครู" }, { status: 404 });
  if (body.newPassword) {
    if (
      body.newPassword !== body.confirmPassword ||
      body.newPassword.length < 8
    )
      return NextResponse.json(
        { message: "รหัสผ่านใหม่ต้องตรงกันและยาวอย่างน้อย 8 ตัวอักษร" },
        { status: 400 },
      );
    if (!verifyPassword(body.currentPassword ?? "", teacher.passwordHash))
      return NextResponse.json(
        { message: "รหัสผ่านเดิมไม่ถูกต้อง" },
        { status: 400 },
      );
  }
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.teacher.update({
      where: { id: teacher.id },
      data: {
        ...(body.email
          ? { email: String(body.email).trim().toLowerCase() }
          : {}),
        ...(body.phone !== undefined
          ? { phone: String(body.phone).trim() || null }
          : {}),
        ...(body.newPassword
          ? { passwordHash: hashPassword(body.newPassword) }
          : {}),
      },
    });
    await tx.auditLog.create({
      data: {
        userId: teacher.id,
        action: "UPDATE",
        entity: "teacher_profile",
        entityId: String(teacher.id),
        description: body.newPassword
          ? "อัปเดตโปรไฟล์และ/หรือรหัสผ่าน"
          : "อัปเดตข้อมูลติดต่อ",
        ...requestMeta(request),
      },
    });
  });
  return NextResponse.json({ ok: true });
}
