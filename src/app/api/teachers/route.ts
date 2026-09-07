import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import type { TeacherStatus } from "@/components/admin/teachers/types";
import { getTeacherPageData } from "@/lib/admin-data";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";

type Body = {
  id?: unknown;
  teacherCode?: unknown;
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  department?: unknown;
  phone?: unknown;
  status?: unknown;
  subjectIds?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^(?:[A-Za-z0-9._-]|\p{Script=Thai})+$/u;
const PHONE_PATTERN = /^[0-9+()\-\s]*$/;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parse(body: Body, editing = false) {
  const teacherCode = text(body.teacherCode),
    fullName = text(body.fullName),
    email = text(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "",
    department = text(body.department),
    phone = text(body.phone),
    status = body.status as TeacherStatus;
  const subjectIds = Array.isArray(body.subjectIds)
    ? [
        ...new Set(
          body.subjectIds
            .map(Number)
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ]
    : [];
  if (
    !teacherCode ||
    teacherCode.length > 30 ||
    !CODE_PATTERN.test(teacherCode)
  )
    return {
      error: "รหัสครูต้องเป็นตัวอักษรหรือตัวเลข และยาวไม่เกิน 30 ตัวอักษร",
    };
  if (!fullName || fullName.length > 150)
    return { error: "ชื่อ-สกุลต้องมีความยาวไม่เกิน 150 ตัวอักษร" };
  if (!EMAIL_PATTERN.test(email) || email.length > 255)
    return { error: "กรุณากรอกอีเมลให้ถูกต้อง" };
  if ((!editing || password) && (password.length < 8 || password.length > 128))
    return { error: "รหัสผ่านต้องมี 8–128 ตัวอักษร" };
  if (!department || department.length > 100)
    return { error: "กรุณาระบุกลุ่มสาระให้ถูกต้อง" };
  if (phone.length > 30 || !PHONE_PATTERN.test(phone))
    return { error: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" };
  if (!(["ACTIVE", "INACTIVE"] as const).includes(status))
    return { error: "สถานะครูไม่ถูกต้อง" };
  return {
    value: {
      teacherCode,
      fullName,
      email,
      password,
      department,
      phone,
      status,
      subjectIds,
    },
  };
}

async function validateUnique(
  connection: PoolConnection,
  value: { teacherCode: string; email: string; subjectIds: number[] },
  currentId?: number,
) {
  const [emailRows] = await connection.execute<
    (RowDataPacket & { id: number; role: string })[]
  >(
    "SELECT id,'admin' role FROM admins WHERE email=? UNION ALL SELECT id,'teacher' FROM teachers WHERE email=? UNION ALL SELECT id,'student' FROM students WHERE email=? LIMIT 1",
    [value.email, value.email, value.email],
  );
  const owner = emailRows[0];
  if (owner && (owner.role !== "teacher" || owner.id !== currentId))
    throw new Error("EMAIL_EXISTS");
  const [codeRows] = await connection.execute<RowDataPacket[]>(
    `SELECT id FROM teachers WHERE teacher_code=?${currentId ? " AND id<>?" : ""} LIMIT 1`,
    currentId ? [value.teacherCode, currentId] : [value.teacherCode],
  );
  if (codeRows.length) throw new Error("CODE_EXISTS");
  if (value.subjectIds.length) {
    const placeholders = value.subjectIds.map(() => "?").join(",");
    const [subjectRows] = await connection.execute<
      (RowDataPacket & { total: number })[]
    >(
      `SELECT COUNT(*) total FROM subjects WHERE id IN (${placeholders})`,
      value.subjectIds,
    );
    if (Number(subjectRows[0]?.total) !== value.subjectIds.length)
      throw new Error("SUBJECT_NOT_FOUND");
  }
}

async function assignSubjects(
  connection: PoolConnection,
  teacherId: number,
  subjectIds: number[],
) {
  await connection.execute(
    "UPDATE subjects SET teacher_id=NULL WHERE teacher_id=?",
    [teacherId],
  );
  if (subjectIds.length) {
    const placeholders = subjectIds.map(() => "?").join(",");
    await connection.execute(
      `UPDATE subjects SET teacher_id=? WHERE id IN (${placeholders})`,
      [teacherId, ...subjectIds],
    );
  }
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === "EMAIL_EXISTS")
    return Response.json(
      { message: "อีเมลนี้มีบัญชีอยู่แล้ว" },
      { status: 409 },
    );
  if (message === "CODE_EXISTS")
    return Response.json({ message: "รหัสครูนี้มีอยู่แล้ว" }, { status: 409 });
  if (message === "SUBJECT_NOT_FOUND")
    return Response.json(
      { message: "มีรายวิชาที่เลือกไม่อยู่ในระบบ" },
      { status: 400 },
    );
  if ((error as { code?: string })?.code === "ER_DUP_ENTRY")
    return Response.json(
      { message: "รหัสครูหรืออีเมลนี้มีอยู่แล้ว" },
      { status: 409 },
    );
  if ((error as { code?: string })?.code === "ER_ROW_IS_REFERENCED_2")
    return Response.json(
      { message: "ไม่สามารถลบครูที่มีข้อมูลเชื่อมโยงอยู่" },
      { status: 409 },
    );
  console.error("Admin teacher operation failed", error);
  return Response.json(
    { message: "ไม่สามารถจัดการข้อมูลครูได้" },
    { status: 500 },
  );
}

export async function GET() {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  return Response.json(await getTeacherPageData());
}

export async function POST(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const parsed = parse((await request.json()) as Body);
  if ("error" in parsed)
    return Response.json({ message: parsed.error }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateUnique(connection, parsed.value);
    const [result] = await connection.execute<ResultSetHeader>(
      "INSERT INTO teachers(email,full_name,password_hash,teacher_code,department,phone,status) VALUES(?,?,?,?,?,?,?)",
      [
        parsed.value.email,
        parsed.value.fullName,
        hashPassword(parsed.value.password),
        parsed.value.teacherCode,
        parsed.value.department,
        parsed.value.phone || null,
        parsed.value.status,
      ],
    );
    await assignSubjects(connection, result.insertId, parsed.value.subjectIds);
    await connection.commit();
    await recordAdminAudit(request, "CREATE", "teacher", result.insertId, `เพิ่มครู ${parsed.value.teacherCode} ${parsed.value.fullName}`);
    return Response.json({ message: "เพิ่มครูสำเร็จ" }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally {
    connection.release();
  }
}

export async function PUT(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = (await request.json()) as Body,
    id = Number(body.id),
    parsed = parse(body, true);
  if (!Number.isInteger(id) || id < 1)
    return Response.json({ message: "ไม่พบครู" }, { status: 400 });
  if ("error" in parsed)
    return Response.json({ message: parsed.error }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await validateUnique(connection, parsed.value, id);
    const fields = [
      parsed.value.email,
      parsed.value.fullName,
      parsed.value.teacherCode,
      parsed.value.department,
      parsed.value.phone || null,
      parsed.value.status,
    ];
    const [result] = parsed.value.password
      ? await connection.execute<ResultSetHeader>(
          "UPDATE teachers SET email=?,full_name=?,teacher_code=?,department=?,phone=?,status=?,password_hash=? WHERE id=?",
          [...fields, hashPassword(parsed.value.password), id],
        )
      : await connection.execute<ResultSetHeader>(
          "UPDATE teachers SET email=?,full_name=?,teacher_code=?,department=?,phone=?,status=? WHERE id=?",
          [...fields, id],
        );
    if (!result.affectedRows) {
      await connection.rollback();
      return Response.json({ message: "ไม่พบครู" }, { status: 404 });
    }
    await assignSubjects(connection, id, parsed.value.subjectIds);
    await connection.commit();
    await recordAdminAudit(request, "UPDATE", "teacher", id, `แก้ไขครู ${parsed.value.teacherCode} ${parsed.value.fullName}`);
    return Response.json({ message: "แก้ไขข้อมูลครูสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally {
    connection.release();
  }
}

export async function PATCH(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = (await request.json()) as Body,
    id = Number(body.id),
    password = typeof body.password === "string" ? body.password : "";
  if (!Number.isInteger(id) || id < 1)
    return Response.json({ message: "ไม่พบครู" }, { status: 400 });
  if (password.length < 8 || password.length > 128)
    return Response.json(
      { message: "รหัสผ่านต้องมี 8–128 ตัวอักษร" },
      { status: 400 },
    );
  const [result] = await db.execute<ResultSetHeader>(
    "UPDATE teachers SET password_hash=? WHERE id=?",
    [hashPassword(password), id],
  );
  if (!result.affectedRows)
    return Response.json({ message: "ไม่พบครู" }, { status: 404 });
  await recordAdminAudit(request, "PASSWORD_CHANGE", "teacher", id, `เปลี่ยนรหัสผ่านครูรหัส ${id}`);
  return Response.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
}

export async function DELETE(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1)
    return Response.json({ message: "ไม่พบครู" }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [relations] = await connection.execute<
      (RowDataPacket & { subjects: number; classrooms: number })[]
    >(
      "SELECT (SELECT COUNT(*) FROM subjects WHERE teacher_id=?) subjects,(SELECT COUNT(*) FROM classrooms WHERE advisor_teacher_id=?) classrooms",
      [id, id],
    );
    if (relations[0]?.subjects || relations[0]?.classrooms) {
      await connection.rollback();
      return Response.json(
        {
          message: `ไม่สามารถลบครูได้ เนื่องจากรับผิดชอบ ${relations[0]?.subjects || 0} รายวิชา และเป็นครูที่ปรึกษา ${relations[0]?.classrooms || 0} ห้อง`,
        },
        { status: 409 },
      );
    }
    const [result] = await connection.execute<ResultSetHeader>(
      "DELETE FROM teachers WHERE id=?",
      [id],
    );
    if (!result.affectedRows) {
      await connection.rollback();
      return Response.json({ message: "ไม่พบครู" }, { status: 404 });
    }
    await connection.commit();
    await recordAdminAudit(request, "DELETE", "teacher", id, `ลบครูรหัสฐานข้อมูล ${id}`);
    return Response.json({ message: "ลบข้อมูลครูสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally {
    connection.release();
  }
}
