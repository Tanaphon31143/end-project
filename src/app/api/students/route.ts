import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { StudentStatus } from "@/components/admin/students/types";
import { getAdminSession } from "@/lib/auth";
import { getStudentPageData } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";

type Body = {
  id?: unknown; studentCode?: unknown; fullName?: unknown; email?: unknown;
  password?: unknown; classId?: unknown; classNumber?: unknown;
  parentName?: unknown; phone?: unknown; status?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^(?:[A-Za-z0-9._-]|\p{Script=Thai})+$/u;
const PHONE_PATTERN = /^[0-9+()\-\s]*$/;

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

function parse(body: Body, editing = false) {
  const studentCode = text(body.studentCode), fullName = text(body.fullName);
  const email = text(body.email).toLowerCase(), password = typeof body.password === "string" ? body.password : "";
  const classId = Number(body.classId), classNumber = Number(body.classNumber);
  const parentName = text(body.parentName), phone = text(body.phone), status = body.status as StudentStatus;
  if (!studentCode || studentCode.length > 50 || !CODE_PATTERN.test(studentCode)) return { error: "รหัสนักเรียนต้องเป็นตัวอักษรหรือตัวเลข และยาวไม่เกิน 50 ตัวอักษร" };
  if (!fullName || fullName.length > 150) return { error: "ชื่อ-สกุลต้องมีความยาวไม่เกิน 150 ตัวอักษร" };
  if (!EMAIL_PATTERN.test(email) || email.length > 255) return { error: "กรุณากรอกอีเมลให้ถูกต้อง" };
  if ((!editing || password) && (password.length < 8 || password.length > 128)) return { error: "รหัสผ่านต้องมี 8–128 ตัวอักษร" };
  if (!Number.isInteger(classId) || classId < 1) return { error: "กรุณาเลือกห้องเรียน" };
  if (!Number.isInteger(classNumber) || classNumber < 1 || classNumber > 999) return { error: "เลขที่ต้องเป็นจำนวนเต็มระหว่าง 1–999" };
  if (parentName.length > 150) return { error: "ชื่อผู้ปกครองต้องไม่เกิน 150 ตัวอักษร" };
  if (phone.length > 30 || !PHONE_PATTERN.test(phone)) return { error: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" };
  if (!(["ACTIVE", "INACTIVE"] as const).includes(status)) return { error: "สถานะนักเรียนไม่ถูกต้อง" };
  return { value: { studentCode, fullName, email, password, classId, classNumber, parentName, phone, status } };
}

async function validateReferences(connection: PoolConnection, value: { email: string; studentCode: string; classId: number; classNumber: number }, currentId?: number) {
  const [classRows] = await connection.execute<RowDataPacket[]>("SELECT id FROM classrooms WHERE id=?", [value.classId]);
  if (!classRows.length) throw new Error("CLASS_NOT_FOUND");
  const [emailRows] = await connection.execute<(RowDataPacket & { id: number; role: string })[]>(
    "SELECT id,'admin' role FROM admins WHERE email=? UNION ALL SELECT id,'teacher' FROM teachers WHERE email=? UNION ALL SELECT id,'student' FROM students WHERE email=? LIMIT 1",
    [value.email, value.email, value.email],
  );
  const owner = emailRows[0];
  if (owner && (owner.role !== "student" || owner.id !== currentId)) throw new Error("EMAIL_EXISTS");
  const [codeRows] = await connection.execute<RowDataPacket[]>(`SELECT id FROM students WHERE student_code=?${currentId ? " AND id<>?" : ""} LIMIT 1`, currentId ? [value.studentCode, currentId] : [value.studentCode]);
  if (codeRows.length) throw new Error("CODE_EXISTS");
  const [numberRows] = await connection.execute<RowDataPacket[]>(`SELECT id FROM students WHERE class_id=? AND class_number=?${currentId ? " AND id<>?" : ""} LIMIT 1`, currentId ? [value.classId, value.classNumber, currentId] : [value.classId, value.classNumber]);
  if (numberRows.length) throw new Error("CLASS_NUMBER_EXISTS");
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "CLASS_NOT_FOUND") return Response.json({ message: "ไม่พบห้องเรียนที่เลือก" }, { status: 400 });
  if (message === "EMAIL_EXISTS") return Response.json({ message: "อีเมลนี้มีบัญชีอยู่แล้ว" }, { status: 409 });
  if (message === "CODE_EXISTS") return Response.json({ message: "รหัสนักเรียนนี้มีอยู่แล้ว" }, { status: 409 });
  if (message === "CLASS_NUMBER_EXISTS") return Response.json({ message: "เลขที่นี้มีนักเรียนใช้แล้วในห้องที่เลือก" }, { status: 409 });
  if ((error as { code?: string })?.code === "ER_DUP_ENTRY") return Response.json({ message: "รหัสนักเรียนหรืออีเมลนี้มีอยู่แล้ว" }, { status: 409 });
  if ((error as { code?: string })?.code === "ER_ROW_IS_REFERENCED_2") return Response.json({ message: "ไม่สามารถลบนักเรียนที่มีข้อมูลเชื่อมโยงอยู่" }, { status: 409 });
  console.error("Admin student operation failed", error);
  return Response.json({ message: "ไม่สามารถจัดการข้อมูลนักเรียนได้" }, { status: 500 });
}

export async function GET() {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  return Response.json(await getStudentPageData());
}

export async function POST(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const parsed = parse(await request.json() as Body);
  if ("error" in parsed) return Response.json({ message: parsed.error }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateReferences(connection, parsed.value);
    const [result] = await connection.execute<ResultSetHeader>("INSERT INTO students(email,full_name,student_code,password_hash,class_id,class_number,parent_name,phone,status) VALUES(?,?,?,?,?,?,?,?,?)", [parsed.value.email, parsed.value.fullName, parsed.value.studentCode, hashPassword(parsed.value.password), parsed.value.classId, parsed.value.classNumber, parsed.value.parentName || null, parsed.value.phone || null, parsed.value.status]);
    await connection.commit();
    await recordAdminAudit(request, "CREATE", "student", result.insertId, `เพิ่มนักเรียน ${parsed.value.studentCode} ${parsed.value.fullName}`);
    return Response.json({ message: "เพิ่มนักเรียนสำเร็จ" }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally { connection.release(); }
}

export async function PUT(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = await request.json() as Body, id = Number(body.id), parsed = parse(body, true);
  if (!Number.isInteger(id) || id < 1) return Response.json({ message: "ไม่พบนักเรียน" }, { status: 400 });
  if ("error" in parsed) return Response.json({ message: parsed.error }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateReferences(connection, parsed.value, id);
    const fields = [parsed.value.email, parsed.value.fullName, parsed.value.studentCode, parsed.value.classId, parsed.value.classNumber, parsed.value.parentName || null, parsed.value.phone || null, parsed.value.status];
    const [result] = parsed.value.password
      ? await connection.execute<ResultSetHeader>("UPDATE students SET email=?,full_name=?,student_code=?,class_id=?,class_number=?,parent_name=?,phone=?,status=?,password_hash=? WHERE id=?", [...fields, hashPassword(parsed.value.password), id])
      : await connection.execute<ResultSetHeader>("UPDATE students SET email=?,full_name=?,student_code=?,class_id=?,class_number=?,parent_name=?,phone=?,status=? WHERE id=?", [...fields, id]);
    if (!result.affectedRows) { await connection.rollback(); return Response.json({ message: "ไม่พบนักเรียน" }, { status: 404 }); }
    await connection.commit();
    await recordAdminAudit(request, "UPDATE", "student", id, `แก้ไขนักเรียน ${parsed.value.studentCode} ${parsed.value.fullName}`);
    return Response.json({ message: "แก้ไขข้อมูลนักเรียนสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally { connection.release(); }
}

export async function DELETE(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ message: "ไม่พบนักเรียน" }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [attendance] = await connection.execute<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) total FROM attendance_records WHERE student_id=?", [id]);
    if (attendance[0]?.total) { await connection.rollback(); return Response.json({ message: "ไม่สามารถลบนักเรียนที่มีประวัติการเข้าเรียนได้ สามารถระงับบัญชีแทนได้" }, { status: 409 }); }
    await connection.execute("DELETE FROM face_data WHERE student_id=?", [id]);
    const [result] = await connection.execute<ResultSetHeader>("DELETE FROM students WHERE id=?", [id]);
    if (!result.affectedRows) { await connection.rollback(); return Response.json({ message: "ไม่พบนักเรียน" }, { status: 404 }); }
    await connection.commit();
    await recordAdminAudit(request, "DELETE", "student", id, `ลบนักเรียนรหัสฐานข้อมูล ${id}`);
    return Response.json({ message: "ลบนักเรียนสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally { connection.release(); }
}
