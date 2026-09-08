import type { RowDataPacket } from "mysql2/promise";
import { getAdminSession, getTeacherSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { protectTeacherMutation } from "@/lib/api-security";
import { faceSimilarity, isFaceEmbedding } from "@/lib/face-match";
export const runtime = "nodejs";
type SampleRow = RowDataPacket & {
  studentId: number;
  studentCode: string;
  studentName: string;
  className: string;
  embedding: string | number[];
};
export async function POST(request: Request) {
  const [adminSession, teacherSession] = await Promise.all([
    getAdminSession(),
    getTeacherSession(),
  ]);
  if (!adminSession && !teacherSession)
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  if (teacherSession) {
    const blocked = protectTeacherMutation(request, teacherSession.id, "face-recognition", 30);
    if (blocked) return blocked;
  }
  const body = (await request.json()) as {
      embedding?: unknown;
      threshold?: unknown;
      sessionId?: unknown;
    },
    embedding = body.embedding;
  if (!isFaceEmbedding(embedding))
    return Response.json(
      { message: "ข้อมูลใบหน้าไม่ถูกต้อง" },
      { status: 400 },
    );
  let classroomId: number | null = null;
  if (teacherSession) {
    let sessionId: bigint;
    try {
      sessionId = BigInt(String(body.sessionId ?? ""));
    } catch {
      return Response.json(
        { message: "กรุณาระบุรอบเช็คชื่อที่ถูกต้อง" },
        { status: 400 },
      );
    }
    const session = await prisma.checkInSession.findFirst({
      where: {
        id: sessionId,
        status: "ACTIVE",
        sessionDate: new Date(
          `${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())}T00:00:00.000Z`,
        ),
        subject: { teacherId: teacherSession.id },
      },
      select: { classroomId: true },
    });
    if (!session)
      return Response.json(
        { message: "ไม่พบรอบเช็คชื่อที่เปิดอยู่หรือไม่มีสิทธิ์" },
        { status: 403 },
      );
    classroomId = session.classroomId;
  }
  type ThresholdRow = RowDataPacket & { threshold: number };
  const [settings] = await db.execute<ThresholdRow[]>("SELECT CAST(face_match_threshold AS DOUBLE) threshold FROM school_settings ORDER BY id LIMIT 1");
  const configuredThreshold = Number(settings[0]?.threshold);
  const threshold = teacherSession
    ? Math.min(0.9, Math.max(0.5, configuredThreshold || 0.55))
    : Math.min(0.9, Math.max(0.5, Number(body.threshold) || configuredThreshold || 0.55));
  const [rows] = await db.execute<SampleRow[]>(
    `SELECT fs.student_id studentId,s.student_code studentCode,s.full_name studentName,COALESCE(c.name,'ยังไม่ระบุ') className,fs.embedding FROM face_samples fs JOIN face_data fd ON fd.student_id=fs.student_id AND fd.status='READY' JOIN students s ON s.id=fs.student_id AND s.status='ACTIVE' LEFT JOIN classrooms c ON c.id=s.class_id${classroomId === null ? "" : " WHERE s.class_id=?"}`,
    classroomId === null ? [] : [classroomId],
  );
  let best: SampleRow | null = null,
    bestSimilarity = 0;
  for (const row of rows) {
    const stored =
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding;
    if (!isFaceEmbedding(stored)) continue;
    const score = faceSimilarity(embedding, stored);
    if (score > bestSimilarity) {
      bestSimilarity = score;
      best = row;
    }
  }
  if (!best || bestSimilarity < threshold)
    return Response.json({
      matched: false,
      similarity: bestSimilarity,
      threshold,
    });
  return Response.json({
    matched: true,
    similarity: bestSimilarity,
    threshold,
    student: {
      id: best.studentId,
      code: best.studentCode,
      name: best.studentName,
      className: best.className,
    },
  });
}
