import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUsers } from "@/lib/admin-data";
import { hashPassword } from "@/lib/password";
import type { UserRole, UserStatus } from "@/components/admin/users/types";
import { recordAdminAudit } from "@/lib/admin-audit";

export const runtime = "nodejs";

type UserPayload = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  status?: unknown;
  code?: unknown;
  password?: unknown;
};

type AccountRow = RowDataPacket & {
  id: number;
  email: string;
  full_name: string;
  password_hash: string;
  status: UserStatus;
  code: string | null;
};

const PREFIX_ROLE: Record<string, UserRole> = {
  A: "admin",
  T: "teacher",
  S: "student",
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_PATTERN = /^(?:[A-Za-z0-9._-]|\p{Script=Thai})+$/u;

function parseRef(value: unknown) {
  const match = typeof value === "string" ? /^([ATS])(\d+)$/.exec(value) : null;
  if (!match) return null;
  return { role: PREFIX_ROLE[match[1]], id: Number(match[2]) };
}

function parsePayload(body: UserPayload, requirePassword: boolean) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role as UserRole;
  const status = body.status as UserStatus;
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!name || name.length > 150)
    return { error: "ชื่อ-สกุลต้องมีความยาวไม่เกิน 150 ตัวอักษร" };
  if (!EMAIL_PATTERN.test(email) || email.length > 255)
    return { error: "กรุณากรอกอีเมลให้ถูกต้อง" };
  if (!(["admin", "teacher", "student"] as const).includes(role))
    return { error: "บทบาทผู้ใช้งานไม่ถูกต้อง" };
  if (!(["ACTIVE", "INACTIVE"] as const).includes(status))
    return { error: "สถานะผู้ใช้งานไม่ถูกต้อง" };
  if (
    role !== "admin" &&
    (!code || code.length > 50 || !CODE_PATTERN.test(code))
  )
    return { error: "รหัสผู้ใช้งานไม่ถูกต้อง" };
  if (
    (requirePassword || password) &&
    (password.length < 8 || password.length > 128)
  )
    return { error: "รหัสผ่านต้องมี 8–128 ตัวอักษร" };
  return { value: { name, email, role, status, code, password } };
}

async function accountByRef(
  connection: PoolConnection,
  role: UserRole,
  id: number,
) {
  const query =
    role === "admin"
      ? "SELECT id,email,full_name,password_hash,status,NULL code FROM admins WHERE id=? FOR UPDATE"
      : role === "teacher"
        ? "SELECT id,email,full_name,password_hash,status,teacher_code code FROM teachers WHERE id=? FOR UPDATE"
        : "SELECT id,email,full_name,password_hash,status,student_code code FROM students WHERE id=? FOR UPDATE";
  const [rows] = await connection.execute<AccountRow[]>(query, [id]);
  return rows[0] ?? null;
}

async function emailOwner(connection: PoolConnection, email: string) {
  const [rows] = await connection.execute<
    (RowDataPacket & { id: number; role: UserRole })[]
  >(
    "SELECT id,'admin' role FROM admins WHERE email=? UNION ALL SELECT id,'teacher' FROM teachers WHERE email=? UNION ALL SELECT id,'student' FROM students WHERE email=? LIMIT 1",
    [email, email, email],
  );
  return rows[0] ?? null;
}

async function assertCodeAvailable(
  connection: PoolConnection,
  role: UserRole,
  code: string,
  currentId?: number,
) {
  if (role === "admin") return;
  const column = role === "teacher" ? "teacher_code" : "student_code";
  const table = role === "teacher" ? "teachers" : "students";
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT id FROM ${table} WHERE ${column}=?${currentId ? " AND id<>?" : ""} LIMIT 1`,
    currentId ? [code, currentId] : [code],
  );
  if (rows.length) throw new Error("USER_CODE_EXISTS");
}

async function assertCanRemoveOrMove(
  connection: PoolConnection,
  role: UserRole,
  id: number,
) {
  if (role === "teacher") {
    const [rows] = await connection.execute<
      (RowDataPacket & { subjects: number; classrooms: number })[]
    >(
      "SELECT (SELECT COUNT(*) FROM subjects WHERE teacher_id=?) subjects,(SELECT COUNT(*) FROM classrooms WHERE advisor_teacher_id=?) classrooms",
      [id, id],
    );
    if (rows[0] && (rows[0].subjects > 0 || rows[0].classrooms > 0))
      throw new Error("USER_HAS_RELATIONS");
  }
  if (role === "student") {
    const [rows] = await connection.execute<
      (RowDataPacket & { faces: number; attendance: number })[]
    >(
      "SELECT (SELECT COUNT(*) FROM face_data WHERE student_id=?) faces,(SELECT COUNT(*) FROM attendance_records WHERE student_id=?) attendance",
      [id, id],
    );
    if (rows[0] && (rows[0].faces > 0 || rows[0].attendance > 0))
      throw new Error("USER_HAS_RELATIONS");
  }
}

async function assertNotLastActiveAdmin(
  connection: PoolConnection,
  account: AccountRow,
) {
  if (account.status !== "ACTIVE") return;
  const [rows] = await connection.execute<
    (RowDataPacket & { total: number })[]
  >("SELECT COUNT(*) total FROM admins WHERE status='ACTIVE'");
  if ((rows[0]?.total ?? 0) <= 1) throw new Error("LAST_ACTIVE_ADMIN");
}

async function insertAccount(
  connection: PoolConnection,
  value: {
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    code: string;
    passwordHash: string;
  },
) {
  if (value.role === "admin") {
    await connection.execute(
      "INSERT INTO admins(email,full_name,password_hash,status) VALUES(?,?,?,?)",
      [value.email, value.name, value.passwordHash, value.status],
    );
  } else if (value.role === "teacher") {
    await connection.execute(
      "INSERT INTO teachers(email,full_name,password_hash,teacher_code,status) VALUES(?,?,?,?,?)",
      [value.email, value.name, value.passwordHash, value.code, value.status],
    );
  } else {
    await connection.execute(
      "INSERT INTO students(email,full_name,password_hash,student_code,status) VALUES(?,?,?,?,?)",
      [value.email, value.name, value.passwordHash, value.code, value.status],
    );
  }
}

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "USER_CODE_EXISTS")
    return Response.json(
      { message: "รหัสผู้ใช้งานนี้มีอยู่แล้ว" },
      { status: 409 },
    );
  if (code === "USER_HAS_RELATIONS")
    return Response.json(
      {
        message:
          "ไม่สามารถลบหรือเปลี่ยนบทบาทได้ เนื่องจากบัญชีนี้มีข้อมูลรายวิชา ห้องเรียน ใบหน้า หรือการเข้าเรียนเชื่อมโยงอยู่",
      },
      { status: 409 },
    );
  if (code === "LAST_ACTIVE_ADMIN")
    return Response.json(
      { message: "ระบบต้องมี Admin ที่ใช้งานได้อย่างน้อย 1 บัญชี" },
      { status: 409 },
    );
  if ((error as { code?: string })?.code === "ER_DUP_ENTRY")
    return Response.json(
      { message: "อีเมลหรือรหัสผู้ใช้งานนี้มีอยู่แล้ว" },
      { status: 409 },
    );
  console.error("Admin user operation failed", error);
  return Response.json(
    { message: "ไม่สามารถจัดการบัญชีผู้ใช้งานได้" },
    { status: 500 },
  );
}

export async function GET() {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  return Response.json({ users: await getUsers() });
}

export async function POST(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const parsed = parsePayload((await request.json()) as UserPayload, true);
  if ("error" in parsed)
    return Response.json({ message: parsed.error }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (await emailOwner(connection, parsed.value.email)) {
      await connection.rollback();
      return Response.json(
        { message: "อีเมลนี้มีบัญชีอยู่แล้ว" },
        { status: 409 },
      );
    }
    await assertCodeAvailable(connection, parsed.value.role, parsed.value.code);
    await insertAccount(connection, {
      ...parsed.value,
      passwordHash: hashPassword(parsed.value.password),
    });
    await connection.commit();
    await recordAdminAudit(request, "CREATE", "user", parsed.value.email, `เพิ่มผู้ใช้งาน ${parsed.value.email} (${parsed.value.role})`);
    return Response.json({ message: "เพิ่มผู้ใช้งานสำเร็จ" }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally {
    connection.release();
  }
}

export async function PUT(request: Request) {
  const session = await getAdminSession();
  if (!session)
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = (await request.json()) as UserPayload;
  const ref = parseRef(body.id);
  const parsed = parsePayload(body, false);
  if (!ref)
    return Response.json({ message: "ไม่พบบัญชีผู้ใช้งาน" }, { status: 400 });
  if ("error" in parsed)
    return Response.json({ message: parsed.error }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const account = await accountByRef(connection, ref.role, ref.id);
    if (!account) {
      await connection.rollback();
      return Response.json({ message: "ไม่พบบัญชีผู้ใช้งาน" }, { status: 404 });
    }
    const changesOwnAccess =
      ref.role === "admin" &&
      ref.id === session.id &&
      (parsed.value.role !== "admin" || parsed.value.status !== "ACTIVE");
    if (changesOwnAccess) {
      await connection.rollback();
      return Response.json(
        { message: "ไม่สามารถเปลี่ยนบทบาทหรือระงับบัญชีที่กำลังใช้งานอยู่" },
        { status: 409 },
      );
    }
    const owner = await emailOwner(connection, parsed.value.email);
    if (owner && (owner.role !== ref.role || owner.id !== ref.id)) {
      await connection.rollback();
      return Response.json(
        { message: "อีเมลนี้มีบัญชีอยู่แล้ว" },
        { status: 409 },
      );
    }
    await assertCodeAvailable(
      connection,
      parsed.value.role,
      parsed.value.code,
      parsed.value.role === ref.role ? ref.id : undefined,
    );
    if (
      ref.role === "admin" &&
      (parsed.value.role !== "admin" || parsed.value.status !== "ACTIVE")
    )
      await assertNotLastActiveAdmin(connection, account);

    if (parsed.value.role === ref.role) {
      if (ref.role === "admin")
        await connection.execute(
          "UPDATE admins SET full_name=?,email=?,status=? WHERE id=?",
          [parsed.value.name, parsed.value.email, parsed.value.status, ref.id],
        );
      else if (ref.role === "teacher")
        await connection.execute(
          "UPDATE teachers SET full_name=?,email=?,teacher_code=?,status=? WHERE id=?",
          [
            parsed.value.name,
            parsed.value.email,
            parsed.value.code,
            parsed.value.status,
            ref.id,
          ],
        );
      else
        await connection.execute(
          "UPDATE students SET full_name=?,email=?,student_code=?,status=? WHERE id=?",
          [
            parsed.value.name,
            parsed.value.email,
            parsed.value.code,
            parsed.value.status,
            ref.id,
          ],
        );
    } else {
      await assertCanRemoveOrMove(connection, ref.role, ref.id);
      await insertAccount(connection, {
        ...parsed.value,
        passwordHash: account.password_hash,
      });
      const table =
        ref.role === "admin"
          ? "admins"
          : ref.role === "teacher"
            ? "teachers"
            : "students";
      await connection.execute(`DELETE FROM ${table} WHERE id=?`, [ref.id]);
    }
    await connection.commit();
    await recordAdminAudit(request, "UPDATE", "user", String(body.id), `แก้ไขผู้ใช้งาน ${parsed.value.email} (${parsed.value.role})`);
    return Response.json({ message: "แก้ไขผู้ใช้งานสำเร็จ" });
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
  const body = (await request.json()) as UserPayload;
  const ref = parseRef(body.id);
  const password = typeof body.password === "string" ? body.password : "";
  if (!ref)
    return Response.json({ message: "ไม่พบบัญชีผู้ใช้งาน" }, { status: 400 });
  if (password.length < 8 || password.length > 128)
    return Response.json(
      { message: "รหัสผ่านต้องมี 8–128 ตัวอักษร" },
      { status: 400 },
    );
  const table =
    ref.role === "admin"
      ? "admins"
      : ref.role === "teacher"
        ? "teachers"
        : "students";
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE ${table} SET password_hash=? WHERE id=?`,
    [hashPassword(password), ref.id],
  );
  if (!result.affectedRows)
    return Response.json({ message: "ไม่พบบัญชีผู้ใช้งาน" }, { status: 404 });
  await recordAdminAudit(request, "PASSWORD_CHANGE", "user", String(body.id), `เปลี่ยนรหัสผ่านผู้ใช้งาน ${String(body.id)}`);
  return Response.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
}

export async function DELETE(request: Request) {
  const session = await getAdminSession();
  if (!session)
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const ref = parseRef(new URL(request.url).searchParams.get("id"));
  if (!ref)
    return Response.json({ message: "ไม่พบบัญชีผู้ใช้งาน" }, { status: 400 });
  if (ref.role === "admin" && ref.id === session.id)
    return Response.json(
      { message: "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่" },
      { status: 409 },
    );
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const account = await accountByRef(connection, ref.role, ref.id);
    if (!account) {
      await connection.rollback();
      return Response.json({ message: "ไม่พบบัญชีผู้ใช้งาน" }, { status: 404 });
    }
    if (ref.role === "admin")
      await assertNotLastActiveAdmin(connection, account);
    await assertCanRemoveOrMove(connection, ref.role, ref.id);
    const table =
      ref.role === "admin"
        ? "admins"
        : ref.role === "teacher"
          ? "teachers"
          : "students";
    await connection.execute(`DELETE FROM ${table} WHERE id=?`, [ref.id]);
    await connection.commit();
    await recordAdminAudit(request, "DELETE", "user", `${ref.role}:${ref.id}`, `ลบบัญชีผู้ใช้งาน ${ref.role} รหัส ${ref.id}`);
    return Response.json({ message: "ลบบัญชีผู้ใช้งานสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    return errorResponse(error);
  } finally {
    connection.release();
  }
}
