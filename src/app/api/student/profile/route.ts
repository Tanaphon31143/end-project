import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  const student = await getStudentSession();
  if (!student)
    return Response.json(
      { message: "กรุณาเข้าสู่ระบบนักเรียน" },
      { status: 401 },
    );
  const body = (await request.json()) as {
    email?: unknown;
    phone?: unknown;
    birthday?: unknown;
    address?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  if (typeof body.newPassword === "string" && body.newPassword) {
    if (body.newPassword.length < 8)
      return Response.json(
        { message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" },
        { status: 400 },
      );
    const [rows] = await db.execute<
      (RowDataPacket & { passwordHash: string })[]
    >(
      `SELECT password_hash passwordHash FROM students WHERE id=? AND status='ACTIVE'`,
      [student.id],
    );
    if (
      !rows[0] ||
      !verifyPassword(String(body.currentPassword || ""), rows[0].passwordHash)
    )
      return Response.json(
        { message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" },
        { status: 400 },
      );
    await db.execute<ResultSetHeader>(
      `UPDATE students SET password_hash=? WHERE id=?`,
      [hashPassword(body.newPassword), student.id],
    );
    return Response.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
  }
  const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    phone = typeof body.phone === "string" ? body.phone.trim() : "",
    birthday =
      typeof body.birthday === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.birthday)
        ? body.birthday
        : null,
    address = typeof body.address === "string" ? body.address.trim() : "";
  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    phone.length > 30 ||
    address.length > 1000
  )
    return Response.json(
      { message: "กรุณากรอกข้อมูลให้ถูกต้อง" },
      { status: 400 },
    );
  try {
    await db.execute<ResultSetHeader>(
      `UPDATE students SET email=?,phone=?,birthday=?,address=? WHERE id=? AND status='ACTIVE'`,
      [email, phone, birthday, address, student.id],
    );
    return Response.json({ message: "บันทึกข้อมูลส่วนตัวแล้ว" });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY")
      return Response.json(
        { message: "อีเมลนี้ถูกใช้งานแล้ว" },
        { status: 409 },
      );
    return Response.json({ message: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}
export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student)
    return Response.json(
      { message: "กรุณาเข้าสู่ระบบนักเรียน" },
      { status: 401 },
    );
  const form = await request.formData(),
    file = form.get("image");
  if (
    !(file instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    return Response.json(
      { message: "รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB" },
      { status: 400 },
    );
  await db.execute(
    `UPDATE students SET profile_image=?,profile_image_mime=? WHERE id=? AND status='ACTIVE'`,
    [Buffer.from(await file.arrayBuffer()), file.type, student.id],
  );
  return Response.json({ message: "อัปเดตรูปโปรไฟล์แล้ว" });
}
