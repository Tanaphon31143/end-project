import type { RowDataPacket } from "mysql2/promise";
import { requireTeacher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type ImageRow = RowDataPacket & { imageData: Buffer; imageMime: string };

export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const query = new URL(request.url).searchParams;
  const studentId = Number(query.get("studentId"));
  let sessionId: bigint;
  try {
    sessionId = BigInt(query.get("sessionId") ?? "");
  } catch {
    return Response.json({ message: "รอบเช็คชื่อไม่ถูกต้อง" }, { status: 400 });
  }
  if (!Number.isInteger(studentId) || studentId < 1)
    return Response.json({ message: "นักเรียนไม่ถูกต้อง" }, { status: 400 });
  const session = await prisma.checkInSession.findFirst({
    where: { id: sessionId, subject: { teacherId: auth.teacher.id } },
    select: { classroomId: true },
  });
  if (!session)
    return Response.json(
      { message: "ไม่พบรอบเช็คชื่อหรือไม่มีสิทธิ์" },
      { status: 404 },
    );
  const student = await prisma.student.findFirst({
    where: { id: studentId, classId: session.classroomId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!student)
    return Response.json(
      { message: "นักเรียนไม่อยู่ในรายวิชานี้" },
      { status: 404 },
    );
  const [rows] = await db.execute<ImageRow[]>(
    "SELECT image_data imageData,image_mime imageMime FROM face_samples WHERE student_id=? ORDER BY is_primary DESC,id DESC LIMIT 1",
    [studentId],
  );
  const image = rows[0];
  if (!image)
    return Response.json({ message: "ไม่พบรูปนักเรียน" }, { status: 404 });
  return new Response(new Uint8Array(image.imageData), {
    headers: {
      "Content-Type": image.imageMime,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
