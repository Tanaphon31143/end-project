import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getAdminSession } from "@/lib/auth";
import { getClassroomPageData } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { recordAdminAudit } from "@/lib/admin-audit";

type Payload = {
  id?: number;
  className?: unknown;
  gradeLevel?: unknown;
  roomNumber?: unknown;
  advisorTeacherId?: unknown;
  academicYear?: unknown;
  semester?: unknown;
  isActive?: unknown;
  note?: unknown;
};
async function admin() {
  return Boolean(await getAdminSession());
}
async function readPayload(request: Request): Promise<Payload | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Payload : null;
  } catch { return null; }
}
function validId(id: number) { return Number.isSafeInteger(id) && id > 0; }
function databaseError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "ER_DUP_ENTRY") return Response.json({ message: "ห้องเรียนนี้มีอยู่ในระบบแล้ว" }, { status: 409 });
  if (code === "ER_NO_REFERENCED_ROW_2") return Response.json({ message: "ไม่พบครูที่ปรึกษาที่เลือก กรุณาโหลดข้อมูลใหม่" }, { status: 400 });
  if (code === "ER_ROW_IS_REFERENCED_2") return Response.json({ message: "ห้องเรียนนี้ยังมีรายวิชาหรือตารางเรียนอ้างอิงอยู่ ไม่สามารถลบได้" }, { status: 409 });
  return Response.json({ message: "ระบบฐานข้อมูลขัดข้อง กรุณาลองใหม่" }, { status: 500 });
}
function parse(b: Payload) {
  const className = String(b.className || "").trim(),
    gradeLevel = String(b.gradeLevel || "").trim(),
    roomNumber = Number(b.roomNumber),
    advisorTeacherId = Number(b.advisorTeacherId),
    academicYear = String(b.academicYear || "").trim(),
    semester = Number(b.semester),
    note = String(b.note || "").trim();
  if (!className) return { error: "กรุณากรอกชื่อห้องเรียน" };
  if (!gradeLevel) return { error: "กรุณาเลือกระดับชั้น" };
  if (!Number.isInteger(roomNumber) || roomNumber < 1)
    return { error: "หมายเลขห้องต้องเป็นจำนวนเต็มบวก" };
  if (!advisorTeacherId) return { error: "กรุณาเลือกครูที่ปรึกษา" };
  if (!academicYear || ![1, 2].includes(semester))
    return { error: "กรุณาระบุปีการศึกษาและภาคเรียน" };
  if (note.length > 255) return { error: "หมายเหตุต้องไม่เกิน 255 ตัวอักษร" };
  return {
    value: {
      className,
      gradeLevel,
      roomNumber,
      advisorTeacherId,
      academicYear,
      semester,
      isActive: b.isActive === false ? 0 : 1,
      note,
    },
  };
}
export async function GET() {
  if (!(await admin()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  return Response.json(await getClassroomPageData());
}
export async function POST(r: Request) {
  if (!(await admin()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = await readPayload(r);
  if (!body) return Response.json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const p = parse(body);
  if ("error" in p) return Response.json({ message: p.error }, { status: 400 });
  try {
  const v = p.value,
    [dup] = await db.execute<RowDataPacket[]>(
      "SELECT id FROM classrooms WHERE name=? AND academic_year=? AND semester=?",
      [v.className, v.academicYear, v.semester],
    );
  if (dup.length)
    return Response.json(
      { message: "ห้องเรียนนี้มีอยู่ในระบบแล้ว" },
      { status: 409 },
    );
  await db.execute<ResultSetHeader>(
    "INSERT INTO classrooms(name,level,room_number,advisor_teacher_id,academic_year,semester,is_active,note) VALUES(?,?,?,?,?,?,?,?)",
    [
      v.className,
      v.gradeLevel,
      v.roomNumber,
      v.advisorTeacherId,
      v.academicYear,
      v.semester,
      v.isActive,
      v.note || null,
    ],
  );
  await recordAdminAudit(r, "CREATE", "classroom", v.className, `เพิ่มห้องเรียน ${v.className}`);
  return Response.json({ message: "เพิ่มห้องเรียนสำเร็จ" }, { status: 201 });
  } catch (error) { return databaseError(error); }
}
export async function PUT(r: Request) {
  if (!(await admin()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const b = await readPayload(r);
  if (!b) return Response.json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const
    p = parse(b),
    id = Number(b.id);
  if (!validId(id)) return Response.json({ message: "รหัสห้องเรียนไม่ถูกต้อง" }, { status: 400 });
  if ("error" in p) return Response.json({ message: p.error }, { status: 400 });
  const v = p.value;
  try {
    const [result] = await db.execute<ResultSetHeader>(
      "UPDATE classrooms SET name=?,level=?,room_number=?,advisor_teacher_id=?,academic_year=?,semester=?,is_active=?,note=? WHERE id=?",
      [
        v.className,
        v.gradeLevel,
        v.roomNumber,
        v.advisorTeacherId,
        v.academicYear,
        v.semester,
        v.isActive,
        v.note || null,
        id,
      ],
    );
    if (!result.affectedRows)
      return Response.json({ message: "ไม่พบห้องเรียน" }, { status: 404 });
    await recordAdminAudit(r, "UPDATE", "classroom", id, `แก้ไขห้องเรียน ${v.className}`);
    return Response.json({ message: "แก้ไขห้องเรียนสำเร็จ" });
  } catch (error) { return databaseError(error); }
}
export async function DELETE(r: Request) {
  if (!(await admin()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const id = Number(new URL(r.url).searchParams.get("id"));
  if (!validId(id)) return Response.json({ message: "รหัสห้องเรียนไม่ถูกต้อง" }, { status: 400 });
  try {
  const [count] = await db.execute<(RowDataPacket & { total: number })[]>(
    "SELECT COUNT(*) total FROM students WHERE class_id=?",
    [id],
  );
  if (count[0]?.total)
    return Response.json(
      {
        message:
          "ไม่สามารถลบห้องเรียนที่ยังมีนักเรียนอยู่ได้ กรุณาย้ายนักเรียนออกจากห้องก่อน",
      },
      { status: 409 },
    );
  const [result] = await db.execute<ResultSetHeader>("DELETE FROM classrooms WHERE id=?", [id]);
  if (!result.affectedRows) return Response.json({ message: "ไม่พบห้องเรียน" }, { status: 404 });
  await recordAdminAudit(r, "DELETE", "classroom", id, `ลบห้องเรียนรหัส ${id}`);
  return Response.json({ message: "ลบห้องเรียนสำเร็จ" });
  } catch (error) { return databaseError(error); }
}
