import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { StudentStatus } from "@/components/admin/students/types";
import { getAdminSession, revokeAccountSessions } from "@/lib/auth";
import { getStudentPageData } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { recordAdminAudit } from "@/lib/admin-audit";
import { getSchoolTerm, parseAcademicTerm } from "@/lib/academic-term";
import { parseStudentTermAssignment } from "@/lib/student-term-roster-rules.mjs";

export const runtime = "nodejs";

type Body = {
  action?: unknown; id?: unknown; studentId?: unknown; studentCode?: unknown;
  fullName?: unknown; email?: unknown; password?: unknown; classId?: unknown;
  classNumber?: unknown; academicYear?: unknown; semester?: unknown;
  parentName?: unknown; phone?: unknown; status?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^(?:[A-Za-z0-9._-]|\p{Script=Thai})+$/u;
const PHONE_PATTERN = /^[0-9+()\-\s]*$/;

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

function parseProfile(body: Body, editing = false) {
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

async function validateAccountReferences(connection: PoolConnection, value: { email: string; studentCode: string }, currentId?: number) {
  const [emailRows] = await connection.execute<(RowDataPacket & { id: number; role: string })[]>(
    "SELECT id,'admin' role FROM admins WHERE email=? UNION ALL SELECT id,'teacher' FROM teachers WHERE email=? UNION ALL SELECT id,'student' FROM students WHERE email=? LIMIT 1",
    [value.email, value.email, value.email],
  );
  const owner = emailRows[0];
  if (owner && (owner.role !== "student" || owner.id !== currentId)) throw new Error("EMAIL_EXISTS");
  const [codeRows] = await connection.execute<RowDataPacket[]>(`SELECT id FROM students WHERE student_code=?${currentId ? " AND id<>?" : ""} LIMIT 1`, currentId ? [value.studentCode, currentId] : [value.studentCode]);
  if (codeRows.length) throw new Error("CODE_EXISTS");
}

async function validatePlacement(
  connection: PoolConnection,
  value: { classId: number; classNumber: number; academicYear: string; semester: number },
  currentId?: number,
) {
  const [classRows] = await connection.execute<RowDataPacket[]>(
    "SELECT id FROM classrooms WHERE id=?",
    [value.classId],
  );
  if (!classRows.length) throw new Error("CLASS_NOT_FOUND");
  const [numberRows] = await connection.execute<RowDataPacket[]>(`SELECT student_id FROM student_term_enrollments WHERE classroom_id=? AND academic_year=? AND semester=? AND class_number=?${currentId ? " AND student_id<>?" : ""} LIMIT 1`, currentId ? [value.classId, value.academicYear, value.semester, value.classNumber, currentId] : [value.classId, value.academicYear, value.semester, value.classNumber]);
  if (numberRows.length) throw new Error("CLASS_NUMBER_EXISTS");
}

async function resolveTerm(body: Body) {
  return parseAcademicTerm(body, await getSchoolTerm());
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "CLASS_NOT_FOUND") return Response.json({ message: "ไม่พบห้องเรียนในภาคเรียนที่เลือก" }, { status: 400 });
  if (message === "EMAIL_EXISTS") return Response.json({ message: "อีเมลนี้มีบัญชีอยู่แล้ว" }, { status: 409 });
  if (message === "CODE_EXISTS") return Response.json({ message: "รหัสนักเรียนนี้มีอยู่แล้ว" }, { status: 409 });
  if (message === "CLASS_NUMBER_EXISTS") return Response.json({ message: "เลขที่นี้มีนักเรียนใช้แล้วในห้องที่เลือก" }, { status: 409 });
  if (message === "ACCOUNT_NOT_FOUND") return Response.json({ message: "ไม่พบบัญชีนักเรียนที่ระบุ" }, { status: 404 });
  if (message === "ALREADY_ENROLLED") return Response.json({ message: "นักเรียนมีรายชื่อในภาคเรียนนี้แล้ว" }, { status: 409 });
  if (message === "ENROLLMENT_NOT_FOUND") return Response.json({ message: "ไม่พบรายชื่อนักเรียนในภาคเรียนนี้" }, { status: 409 });
  if ((error as { code?: string })?.code === "ER_DUP_ENTRY") return Response.json({ message: "รหัสนักเรียนหรืออีเมลนี้มีอยู่แล้ว" }, { status: 409 });
  if ((error as { code?: string })?.code === "ER_ROW_IS_REFERENCED_2") return Response.json({ message: "ไม่สามารถลบนักเรียนที่มีข้อมูลเชื่อมโยงอยู่" }, { status: 409 });
  console.error("Admin student operation failed", error);
  return Response.json({ message: "ไม่สามารถจัดการข้อมูลนักเรียนได้" }, { status: 500 });
}

export async function GET(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  try {
    const params = new URL(request.url).searchParams;
    const term = parseAcademicTerm({ academicYear: params.get("academicYear"), semester: params.get("semester") }, await getSchoolTerm());
    return Response.json(await getStudentPageData(term));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "โหลดข้อมูลนักเรียนไม่สำเร็จ" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = await request.json().catch(() => null) as Body | null;
  if (!body) return Response.json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  let term;
  try { term = await resolveTerm(body); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "ภาคเรียนไม่ถูกต้อง" }, { status: 400 }); }

  if (body.action === "ENROLL_EXISTING") {
    const parsedAssignment = parseStudentTermAssignment({ ...body, ...term });
    if ("error" in parsedAssignment) return Response.json({ message: parsedAssignment.error }, { status: 400 });
    const assignment = parsedAssignment.value;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const lookupSql = assignment.studentId
        ? "SELECT id,student_code FROM students WHERE id=? LIMIT 1"
        : assignment.studentCode
          ? "SELECT id,student_code FROM students WHERE student_code=? LIMIT 1"
          : "SELECT id,student_code FROM students WHERE email=? LIMIT 1";
      const [accountRows] = await connection.execute<(RowDataPacket & { id: number; student_code: string })[]>(lookupSql, [assignment.studentId ?? assignment.studentCode ?? assignment.email ?? null]);
      const account = accountRows[0];
      if (!account) throw new Error("ACCOUNT_NOT_FOUND");
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM student_term_enrollments WHERE student_id=? AND academic_year=? AND semester=? LIMIT 1",
        [account.id, term.academicYear, term.semester],
      );
      if (existingRows.length) throw new Error("ALREADY_ENROLLED");
      await validatePlacement(connection, { classId: assignment.classroomId, classNumber: assignment.classNumber, academicYear: term.academicYear, semester: term.semester });
      await connection.execute<ResultSetHeader>(
        "INSERT INTO student_term_enrollments(student_id,classroom_id,academic_year,semester,class_number) VALUES(?,?,?,?,?)",
        [account.id, assignment.classroomId, term.academicYear, term.semester, assignment.classNumber],
      );
      await connection.commit();
      await recordAdminAudit(request, "ENROLL", "student_term_enrollment", account.id, `เพิ่มนักเรียน ${account.student_code} ในภาคเรียน ${term.semester}/${term.academicYear}`);
      return Response.json({ message: "เพิ่มนักเรียนเข้าภาคเรียนสำเร็จ" }, { status: 201 });
    } catch (error) {
      await connection.rollback();
      return errorResponse(error);
    } finally { connection.release(); }
  }

  const parsed = parseProfile(body);
  if ("error" in parsed) return Response.json({ message: parsed.error }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateAccountReferences(connection, parsed.value);
    await validatePlacement(connection, { classId: parsed.value.classId, classNumber: parsed.value.classNumber, ...term });
    const [result] = await connection.execute<ResultSetHeader>("INSERT INTO students(email,full_name,student_code,password_hash,must_change_password,parent_name,phone,status) VALUES(?,?,?,?,1,?,?,?)", [parsed.value.email, parsed.value.fullName, parsed.value.studentCode, hashPassword(parsed.value.password), parsed.value.parentName || null, parsed.value.phone || null, parsed.value.status]);
    await connection.execute("INSERT INTO student_term_enrollments(student_id,classroom_id,academic_year,semester,class_number) VALUES(?,?,?,?,?)", [result.insertId, parsed.value.classId, term.academicYear, term.semester, parsed.value.classNumber]);
    await connection.commit();
    await recordAdminAudit(request, "CREATE", "student", result.insertId, `เพิ่มนักเรียน ${parsed.value.studentCode} ${parsed.value.fullName} ในภาคเรียน ${term.semester}/${term.academicYear}`);
    return Response.json({ message: "เพิ่มนักเรียนสำเร็จ" }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally { connection.release(); }
}

export async function PUT(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = await request.json() as Body, id = Number(body.id), parsed = parseProfile(body, true);
  if (!Number.isInteger(id) || id < 1) return Response.json({ message: "ไม่พบนักเรียน" }, { status: 400 });
  if ("error" in parsed) return Response.json({ message: parsed.error }, { status: 400 });
  let term;
  try { term = await resolveTerm(body); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "ภาคเรียนไม่ถูกต้อง" }, { status: 400 }); }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateAccountReferences(connection, parsed.value, id);
    await validatePlacement(connection, { classId: parsed.value.classId, classNumber: parsed.value.classNumber, ...term }, id);
    const fields = [parsed.value.email, parsed.value.fullName, parsed.value.studentCode, parsed.value.parentName || null, parsed.value.phone || null, parsed.value.status];
    const [result] = parsed.value.password
      ? await connection.execute<ResultSetHeader>("UPDATE students SET email=?,full_name=?,student_code=?,parent_name=?,phone=?,status=?,password_hash=?,must_change_password=1 WHERE id=?", [...fields, hashPassword(parsed.value.password), id])
      : await connection.execute<ResultSetHeader>("UPDATE students SET email=?,full_name=?,student_code=?,parent_name=?,phone=?,status=? WHERE id=?", [...fields, id]);
    if (!result.affectedRows) { await connection.rollback(); return Response.json({ message: "ไม่พบนักเรียน" }, { status: 404 }); }
    const [enrollment] = await connection.execute<ResultSetHeader>(
      "UPDATE student_term_enrollments SET classroom_id=?,class_number=? WHERE student_id=? AND academic_year=? AND semester=?",
      [parsed.value.classId, parsed.value.classNumber, id, term.academicYear, term.semester],
    );
    if (!enrollment.affectedRows) throw new Error("ENROLLMENT_NOT_FOUND");
    await connection.commit();
    await revokeAccountSessions("student", id);
    await recordAdminAudit(request, "UPDATE", "student", id, `แก้ไขนักเรียน ${parsed.value.studentCode} ${parsed.value.fullName}`);
    return Response.json({ message: "แก้ไขข้อมูลนักเรียนสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally { connection.release(); }
}

export async function DELETE(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = Number(params.get("id"));
  if (!Number.isInteger(id) || id < 1) return Response.json({ message: "ไม่พบนักเรียน" }, { status: 400 });
  let term;
  try { term = parseAcademicTerm({ academicYear: params.get("academicYear"), semester: params.get("semester") }, await getSchoolTerm()); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "ภาคเรียนไม่ถูกต้อง" }, { status: 400 }); }
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>("DELETE FROM student_term_enrollments WHERE student_id=? AND academic_year=? AND semester=?", [id, term.academicYear, term.semester]);
    if (!result.affectedRows) { await connection.rollback(); return Response.json({ message: "ไม่พบรายชื่อนักเรียนในภาคเรียนนี้" }, { status: 404 }); }
    await connection.commit();
    await recordAdminAudit(request, "UNENROLL", "student_term_enrollment", id, `นำรายชื่อนักเรียน ID ${id} ออกจากภาคเรียน ${term.semester}/${term.academicYear}`);
    return Response.json({ message: "นำรายชื่อนักเรียนออกจากภาคเรียนแล้ว บัญชีและข้อมูลใบหน้ายังคงอยู่" });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally { connection.release(); }
}
