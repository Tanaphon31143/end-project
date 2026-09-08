import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { getFacePageData } from "@/lib/admin-data";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024,
  MIN_SAMPLES = 3,
  MAX_SAMPLES = 5;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function parseEmbeddings(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(String(value));
    if (
      !Array.isArray(parsed) ||
      parsed.length < MIN_SAMPLES ||
      parsed.length > MAX_SAMPLES
    )
      return null;
    const length = Array.isArray(parsed[0]) ? parsed[0].length : 0;
    if (length < 128 || length > 2048) return null;
    for (const embedding of parsed)
      if (
        !Array.isArray(embedding) ||
        embedding.length !== length ||
        embedding.some(
          (item) => typeof item !== "number" || !Number.isFinite(item),
        )
      )
        return null;
    return parsed as number[][];
  } catch {
    return null;
  }
}
function parseQualities(value: FormDataEntryValue | null, count: number) {
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed) || parsed.length !== count) return null;
    return parsed
      .map(Number)
      .map((score) =>
        Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0,
      );
  } catch {
    return null;
  }
}
function parsePoseTypes(value: FormDataEntryValue | null, count: number): (string | null)[] {
  try {
    if (!value) return Array(count).fill(null);
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) return Array(count).fill(null);
    const allowed = new Set(["FRONT", "LEFT", "RIGHT", "UP", "DOWN"]);
    return Array.from({ length: count }, (_, i) => {
      const item = parsed[i];
      return typeof item === "string" && allowed.has(item.toUpperCase())
        ? item.toUpperCase()
        : null;
    });
  } catch {
    return Array(count).fill(null);
  }
}

async function studentExists(connection: PoolConnection, studentId: number) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    "SELECT id FROM students WHERE id=? AND status='ACTIVE'",
    [studentId],
  );
  return rows.length > 0;
}
async function saveRegistration(request: Request, updating: boolean) {
  const adminSession = await getAdminSession();
  if (!adminSession)
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const form = await request.formData(),
    studentId = Number(form.get("studentId")),
    files = form
      .getAll("images")
      .filter((item): item is File => item instanceof File),
    embeddings = parseEmbeddings(form.get("embeddings"));
  if (!Number.isInteger(studentId) || studentId < 1)
    return Response.json({ message: "กรุณาเลือกนักเรียน" }, { status: 400 });
  if (!embeddings || files.length !== embeddings.length)
    return Response.json(
      {
        message: `กรุณาใช้ภาพใบหน้า ${MIN_SAMPLES}–${MAX_SAMPLES} ภาพ และประมวลผลใบหน้าให้ครบ`,
      },
      { status: 400 },
    );
  const qualities = parseQualities(form.get("qualities"), files.length);
  if (!qualities)
    return Response.json(
      { message: "ข้อมูลคุณภาพภาพไม่ถูกต้อง" },
      { status: 400 },
    );
  const poseTypes = parsePoseTypes(form.get("poseTypes"), files.length);

  for (const file of files)
    if (
      !ALLOWED_TYPES.has(file.type) ||
      file.size < 1000 ||
      file.size > MAX_IMAGE_BYTES
    )
      return Response.json(
        { message: "รองรับ JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB ต่อภาพ" },
        { status: 400 },
      );

  const userAgent = request.headers.get("user-agent") || "";
  const isMobile = /mobile|iphone|android/i.test(userAgent);
  const isTablet = /ipad|tablet/i.test(userAgent);
  const deviceType = isTablet ? "แท็บเล็ต" : isMobile ? "โทรศัพท์มือถือ" : "คอมพิวเตอร์ / โน้ตบุ๊ก";
  const browser = userAgent.includes("Edg")
    ? "Microsoft Edge"
    : userAgent.includes("Chrome")
      ? "Google Chrome"
      : userAgent.includes("Firefox")
        ? "Mozilla Firefox"
        : userAgent.includes("Safari")
          ? "Apple Safari"
          : "Web Browser";
  const deviceName = form.get("deviceName")
    ? String(form.get("deviceName"))
    : isMobile
      ? "กล้องสมาร์ตโฟน"
      : "เว็บแคม / กล้องแล็ปท็อป";

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (!(await studentExists(connection, studentId))) {
      await connection.rollback();
      return Response.json(
        { message: "ไม่พบนักเรียนหรือบัญชีถูกระงับ" },
        { status: 404 },
      );
    }
    const [existing] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM face_data WHERE student_id=? FOR UPDATE",
      [studentId],
    );
    if (!updating && existing.length) {
      await connection.rollback();
      return Response.json(
        { message: "นักเรียนคนนี้ลงทะเบียนใบหน้าแล้ว กรุณาใช้การแก้ไข" },
        { status: 409 },
      );
    }
    await connection.execute("DELETE FROM face_samples WHERE student_id=?", [
      studentId,
    ]);
    const sampleIds: number[] = [];
    for (let index = 0; index < files.length; index++) {
      const [result] = await connection.execute<ResultSetHeader>(
        "INSERT INTO face_samples(student_id,image_data,image_mime,embedding,quality_score,pose_type) VALUES(?,?,?,?,?,?)",
        [
          studentId,
          Buffer.from(await files[index].arrayBuffer()),
          files[index].type,
          JSON.stringify(embeddings[index]),
          qualities[index],
          poseTypes[index],
        ],
      );
      sampleIds.push(result.insertId);
    }
    const referenceUrl = `/api/faces/image?id=${sampleIds[0]}`;
    await connection.execute(
      `INSERT INTO face_data(
        student_id, reference_image_url, image_count, status,
        registered_by_id, registered_by_name, registered_by_role,
        device_type, device_name, browser
      ) VALUES (?, ?, ?, 'READY', ?, ?, 'ADMIN', ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        reference_image_url = VALUES(reference_image_url),
        image_count = VALUES(image_count),
        status = 'READY',
        registered_by_id = VALUES(registered_by_id),
        registered_by_name = VALUES(registered_by_name),
        registered_by_role = VALUES(registered_by_role),
        device_type = VALUES(device_type),
        device_name = VALUES(device_name),
        browser = VALUES(browser),
        updated_at = CURRENT_TIMESTAMP`,
      [
        studentId,
        referenceUrl,
        files.length,
        adminSession.id,
        adminSession.name,
        deviceType,
        deviceName,
        browser,
      ],
    );
    await connection.commit();
    return Response.json(
      {
        message: updating
          ? "อัปเดตข้อมูลใบหน้าสำเร็จ"
          : "ลงทะเบียนใบหน้าสำเร็จ",
        sampleCount: files.length,
      },
      { status: updating ? 200 : 201 },
    );
  } catch (error) {
    await connection.rollback();
    console.error("Face registration failed", error);
    return Response.json(
      { message: "ไม่สามารถบันทึกข้อมูลใบหน้าได้" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}

export async function GET() {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  return Response.json(await getFacePageData());
}
export async function POST(request: Request) {
  return saveRegistration(request, false);
}
export async function PUT(request: Request) {
  return saveRegistration(request, true);
}

export async function PATCH(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = (await request.json()) as {
      studentId?: unknown;
      status?: unknown;
    },
    studentId = Number(body.studentId),
    status =
      body.status === "READY"
        ? "READY"
        : body.status === "INACTIVE"
          ? "INACTIVE"
          : null;
  if (!Number.isInteger(studentId) || studentId < 1 || !status)
    return Response.json({ message: "ข้อมูลสถานะไม่ถูกต้อง" }, { status: 400 });
  if (status === "READY") {
    const [rows] = await db.execute<(RowDataPacket & { total: number })[]>(
      "SELECT COUNT(*) total FROM face_samples WHERE student_id=?",
      [studentId],
    );
    if ((rows[0]?.total || 0) < MIN_SAMPLES)
      return Response.json(
        {
          message: `ต้องมีภาพใบหน้าอย่างน้อย ${MIN_SAMPLES} ภาพก่อนเปิดใช้งาน`,
        },
        { status: 409 },
      );
  }
  const [result] = await db.execute<ResultSetHeader>(
    "UPDATE face_data SET status=?,updated_at=CURRENT_TIMESTAMP WHERE student_id=?",
    [status, studentId],
  );
  if (!result.affectedRows)
    return Response.json({ message: "ไม่พบข้อมูลใบหน้า" }, { status: 404 });
  return Response.json({
    message:
      status === "READY"
        ? "เปิดใช้งานข้อมูลใบหน้าแล้ว"
        : "ปิดใช้งานข้อมูลใบหน้าแล้ว",
  });
}

export async function DELETE(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const studentId = Number(new URL(request.url).searchParams.get("studentId"));
  if (!Number.isInteger(studentId) || studentId < 1)
    return Response.json({ message: "ไม่พบข้อมูลใบหน้า" }, { status: 400 });
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM face_samples WHERE student_id=?", [
      studentId,
    ]);
    const [result] = await connection.execute<ResultSetHeader>(
      "DELETE FROM face_data WHERE student_id=?",
      [studentId],
    );
    if (!result.affectedRows) {
      await connection.rollback();
      return Response.json({ message: "ไม่พบข้อมูลใบหน้า" }, { status: 404 });
    }
    await connection.commit();
    return Response.json({ message: "ลบข้อมูลใบหน้าสำเร็จ" });
  } catch (error) {
    await connection.rollback();
    console.error("Face deletion failed", error);
    return Response.json(
      { message: "ไม่สามารถลบข้อมูลใบหน้าได้" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
