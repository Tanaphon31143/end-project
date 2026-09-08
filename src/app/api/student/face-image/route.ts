import type { RowDataPacket } from "mysql2/promise";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
type ImageRow = RowDataPacket & { imageData: Buffer; imageMime: string };
export async function GET(request: Request) {
  const student = await getStudentSession();
  if (!student)
    return Response.json(
      { message: "กรุณาเข้าสู่ระบบนักเรียน" },
      { status: 401 },
    );
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1)
    return Response.json({ message: "ไม่พบรูปภาพ" }, { status: 400 });
  const [rows] = await db.execute<ImageRow[]>(
    `SELECT image_data imageData,image_mime imageMime FROM face_samples WHERE id=? AND student_id=? LIMIT 1`,
    [id, student.id],
  );
  const image = rows[0];
  if (!image) return Response.json({ message: "ไม่พบรูปภาพ" }, { status: 404 });
  return new Response(new Uint8Array(image.imageData), {
    headers: {
      "Content-Type": image.imageMime,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
