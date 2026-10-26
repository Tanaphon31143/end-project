import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getStudentSession, revokeAccountSessions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { DEFAULT_IMPORTED_STUDENT_PASSWORD } from "@/lib/student-password-policy";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  const student = await getStudentSession();
  if (!student)
    return Response.json(
      { message: "กรุณาเข้าสู่ระบบนักเรียน" },
      { status: 401 },
    );
  const body = (await request.json()) as {
    name?: unknown;
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
    if (body.newPassword === DEFAULT_IMPORTED_STUDENT_PASSWORD)
      return Response.json(
        { message: "ห้ามใช้รหัสผ่านเริ่มต้นของระบบ กรุณาตั้งรหัสผ่านใหม่" },
        { status: 400 },
      );
    const [rows] = await db.execute<
      (RowDataPacket & { passwordHash: string; mustChange: number })[]
    >(
      `SELECT password_hash passwordHash,must_change_password mustChange FROM students WHERE id=? AND status='ACTIVE'`,
      [student.id],
    );
    const account = rows[0];
    // A flagged account still holds a password the school handed out, so the
    // signed-in student may replace it without typing it (e.g. after Google sign-in).
    const forcedChange = Boolean(account?.mustChange);
    if (
      !account ||
      (!forcedChange &&
        !(await verifyPassword(String(body.currentPassword || ""), account.passwordHash)))
    )
      return Response.json(
        { message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" },
        { status: 400 },
      );
    if (forcedChange && (await verifyPassword(body.newPassword, account.passwordHash)))
      return Response.json(
        { message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านที่ได้รับจากโรงเรียน" },
        { status: 400 },
      );
    await db.execute<ResultSetHeader>(
      `UPDATE students SET password_hash=?,must_change_password=0 WHERE id=?`,
      [hashPassword(body.newPassword), student.id],
    );
    await revokeAccountSessions("student", student.id);
    return Response.json({ message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว" });
  }
  const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
    name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "",
    phone = typeof body.phone === "string" ? body.phone.trim() : "",
    birthday =
      typeof body.birthday === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(body.birthday)
        ? body.birthday
        : null,
    address = typeof body.address === "string" ? body.address.trim() : "";
  if (
    !name ||
    name.length > 150 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    phone.length > 30 ||
    address.length > 1000
  )
    return Response.json(
      { message: "กรุณากรอกข้อมูลให้ถูกต้อง" },
      { status: 400 },
    );
  try {
    const connection = await db.getConnection();
    let cancelledNameRequest = false;
    try {
      await connection.beginTransaction();
      const [currentRows] = await connection.execute<
        (RowDataPacket & { fullName: string })[]
      >(
        `SELECT full_name fullName FROM students WHERE id=? AND status='ACTIVE' FOR UPDATE`,
        [student.id],
      );
      if (!currentRows[0]) {
        await connection.rollback();
        return Response.json({ message: "ไม่พบบัญชีนักเรียนที่ใช้งานอยู่" }, { status: 404 });
      }
      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE students SET full_name=?,email=?,phone=?,birthday=?,address=? WHERE id=? AND status='ACTIVE'`,
        [name, email, phone, birthday, address, student.id],
      );
      if (result.affectedRows && currentRows[0].fullName !== name) {
        const [cancelled] = await connection.execute<ResultSetHeader>(
          `UPDATE profile_edit_requests SET status='CANCELLED'
           WHERE student_id=? AND field_type='FULL_NAME' AND status='PENDING'`,
          [student.id],
        );
        cancelledNameRequest = cancelled.affectedRows > 0;
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return Response.json({
      message: cancelledNameRequest
        ? "บันทึกข้อมูลแล้ว และยกเลิกคำร้องแก้ไขชื่อเดิมที่รอพิจารณา"
        : "บันทึกข้อมูลส่วนตัวแล้ว",
      name,
    });
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
