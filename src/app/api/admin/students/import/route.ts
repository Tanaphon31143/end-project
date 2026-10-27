import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { getSchoolTerm, parseAcademicTerm } from "@/lib/academic-term";
import { DEFAULT_IMPORTED_STUDENT_PASSWORD } from "@/lib/student-password-policy";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
type Row = {
  studentCode: string;
  fullName: string;
  number: number | null;
  phone: string;
  email: string;
  guardianName: string;
  valid: boolean;
};
export async function POST(r: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = await r.json().catch(() => null) as { classId?: unknown; rows?: Row[]; academicYear?: unknown; semester?: unknown } | null;
  if (!body) return Response.json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const classId = Number(body.classId), rows = Array.isArray(body.rows) ? body.rows : [];
  let term;
  try { term = parseAcademicTerm(body, await getSchoolTerm()); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : "ภาคเรียนไม่ถูกต้อง" }, { status: 400 }); }
  const valid = rows.filter((x) => x.valid);
  if (!classId || !valid.length)
    return Response.json(
      { message: "ไม่มีข้อมูลที่พร้อมนำเข้า" },
      { status: 400 },
    );
  const [rooms] = await db.execute<RowDataPacket[]>("SELECT id FROM classrooms WHERE id=?", [classId]);
  if (!rooms.length) return Response.json({ message: "ไม่พบห้องเรียนที่เลือก" }, { status: 400 });
  const conn = await db.getConnection();
  let success = 0;
  const errors: string[] = [];
  const seenNumbers = new Set<number>();
  try {
    await conn.beginTransaction();
    for (const x of valid) {
      await conn.execute("SAVEPOINT student_import_row");
      try {
        const studentCode = String(x.studentCode ?? "").trim();
        const suppliedEmail = String(x.email ?? "").trim().toLowerCase();
        const email = suppliedEmail || `${studentCode}@student.school.local`;
        const classNumber = x.number == null ? null : Number(x.number);
        if (!studentCode || studentCode.length > 50 || !String(x.fullName ?? "").trim()) throw new Error("กรุณาระบุรหัสนักเรียนและชื่อ");
        if (suppliedEmail && !/^\S+@\S+\.\S+$/.test(suppliedEmail)) throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
        if (classNumber !== null && (!Number.isInteger(classNumber) || classNumber < 1 || classNumber > 999)) throw new Error("เลขที่ไม่ถูกต้อง");
        if (classNumber && seenNumbers.has(classNumber)) throw new Error("เลขที่ซ้ำในไฟล์");
        if (classNumber) {
          const [numberTaken] = await conn.execute<RowDataPacket[]>(
            "SELECT id FROM student_term_enrollments WHERE classroom_id=? AND academic_year=? AND semester=? AND class_number=? LIMIT 1",
            [classId, term.academicYear, term.semester, classNumber],
          );
          if (numberTaken.length) throw new Error("เลขที่ซ้ำในห้องเรียน");
        }

        const [matches] = await conn.execute<(RowDataPacket & { id: number; student_code: string; email: string })[]>(
          "SELECT id,student_code,email FROM students WHERE student_code=? OR email=? LIMIT 2",
          [studentCode, email],
        );
        const byCode = matches.find((match) => match.student_code === studentCode);
        const byEmail = matches.find((match) => match.email.toLowerCase() === email);
        if (byCode && byEmail && byCode.id !== byEmail.id) throw new Error("รหัสนักเรียนและอีเมลเป็นคนละบัญชีกัน");
        const account = byCode || byEmail;
        if (account) {
          const [enrolled] = await conn.execute<RowDataPacket[]>(
            "SELECT id FROM student_term_enrollments WHERE student_id=? AND academic_year=? AND semester=? LIMIT 1",
            [account.id, term.academicYear, term.semester],
          );
          if (enrolled.length) throw new Error("บัญชีนี้มีรายชื่อในภาคเรียนนี้แล้ว");
        } else {
          const [inserted] = await conn.execute<ResultSetHeader>(
            "INSERT INTO students(email,full_name,student_code,password_hash,must_change_password,parent_name,phone) VALUES(?,?,?,?,1,?,?)",
            [email, String(x.fullName).trim(), studentCode, hashPassword(DEFAULT_IMPORTED_STUDENT_PASSWORD), String(x.guardianName || "").trim() || null, String(x.phone || "").trim() || null],
          );
          const studentId = inserted.insertId;
          await conn.execute(
            "INSERT INTO student_term_enrollments(student_id,classroom_id,academic_year,semester,class_number) VALUES(?,?,?,?,?)",
            [studentId, classId, term.academicYear, term.semester, classNumber],
          );
          if (classNumber) seenNumbers.add(classNumber);
          success++;
          await conn.execute("RELEASE SAVEPOINT student_import_row");
          continue;
        }
        await conn.execute(
          "INSERT INTO student_term_enrollments(student_id,classroom_id,academic_year,semester,class_number) VALUES(?,?,?,?,?)",
          [account.id, classId, term.academicYear, term.semester, classNumber],
        );
        if (classNumber) seenNumbers.add(classNumber);
        success++;
        await conn.execute("RELEASE SAVEPOINT student_import_row");
      } catch (error) {
        await conn.execute("ROLLBACK TO SAVEPOINT student_import_row");
        await conn.execute("RELEASE SAVEPOINT student_import_row");
        errors.push(`${x.studentCode}: ${error instanceof Error ? error.message : "บันทึกไม่สำเร็จ"}`);
      }
    }
    await conn.commit();
    return Response.json({
      message: "นำเข้าข้อมูลนักเรียนสำเร็จ",
      success,
      failed: rows.length - success,
      errors,
    });
  } catch {
    await conn.rollback();
    return Response.json(
      { message: "ไม่สามารถนำเข้าข้อมูลได้" },
      { status: 500 },
    );
  } finally {
    conn.release();
  }
}
