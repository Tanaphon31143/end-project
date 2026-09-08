import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireTeacher, requestMeta } from "@/lib/api-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { getTeacherIdentity } from "@/lib/teacher-data";
import { db } from "@/lib/db";
import { protectTeacherMutation } from "@/lib/api-security";

export async function GET() {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const teacher = await getTeacherIdentity(auth.teacher.id);
  if (!teacher)
    return NextResponse.json({ message: "ไม่พบบัญชีครู" }, { status: 404 });
  return NextResponse.json({ teacher });
}

export async function PATCH(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const blocked = protectTeacherMutation(
    request,
    auth.teacher.id,
    "profile-update",
    10,
  );
  if (blocked) return blocked;
  const body = await request.json();
  const teacher = await prisma.teacher.findUnique({
    where: { id: auth.teacher.id },
  });
  if (!teacher)
    return NextResponse.json({ message: "ไม่พบบัญชีครู" }, { status: 404 });
  const email =
    body.email === undefined
      ? undefined
      : String(body.email).trim().toLowerCase();
  const phone =
    body.phone === undefined ? undefined : String(body.phone).trim();
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json(
      { message: "รูปแบบอีเมลไม่ถูกต้อง" },
      { status: 400 },
    );
  if (phone !== undefined && phone.length > 30)
    return NextResponse.json(
      { message: "เบอร์โทรยาวเกินกำหนด" },
      { status: 400 },
    );
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
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.teacher.update({
        where: { id: teacher.id },
        data: {
          ...(email ? { email } : {}),
          ...(phone !== undefined ? { phone: phone || null } : {}),
          ...(body.newPassword
            ? { passwordHash: hashPassword(body.newPassword) }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: teacher.id,
          action: body.newPassword ? "PASSWORD_CHANGE" : "UPDATE",
          entity: "teacher_profile",
          entityId: String(teacher.id),
          description: body.newPassword
            ? "เปลี่ยนรหัสผ่านบัญชีครู"
            : "อัปเดตข้อมูลติดต่อ",
          ...requestMeta(request),
        },
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002")
      return NextResponse.json(
        { message: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 },
      );
    throw error;
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const blocked = protectTeacherMutation(
    request,
    auth.teacher.id,
    "profile-image",
    5,
  );
  if (blocked) return blocked;
  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File))
    return NextResponse.json(
      { message: "กรุณาเลือกรูปโปรไฟล์" },
      { status: 400 },
    );
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(image.type) || image.size > 5 * 1024 * 1024)
    return NextResponse.json(
      { message: "รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" },
      { status: 400 },
    );
  await db.execute(
    `UPDATE teachers SET profile_image=?,profile_image_mime=? WHERE id=?`,
    [Buffer.from(await image.arrayBuffer()), image.type, auth.teacher.id],
  );
  await prisma.auditLog.create({
    data: {
      userId: auth.teacher.id,
      action: "UPDATE",
      entity: "teacher_profile_image",
      entityId: String(auth.teacher.id),
      description: "เปลี่ยนรูปโปรไฟล์ครู",
      ...requestMeta(request),
    },
  });
  return NextResponse.json({ message: "เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว" });
}
