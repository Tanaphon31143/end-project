import type { RowDataPacket } from "mysql2/promise";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
export const runtime = "nodejs";
type SampleRow = RowDataPacket & {
  studentId: number;
  studentCode: string;
  studentName: string;
  className: string;
  embedding: string | number[];
};
function validEmbedding(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length >= 128 &&
    value.length <= 2048 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}
function similarity(a: number[], b: number[]) {
  if (a.length !== b.length) return 0;
  let sum = 0;
  for (let index = 0; index < a.length; index++) {
    const difference = a[index] - b[index];
    sum += difference * difference;
  }
  const distance = Math.round(100 * 25 * sum) / 100;
  if (distance === 0) return 1;
  const root = Math.sqrt(distance),
    normalized = (1 - root / 100 - 0.2) / (0.8 - 0.2);
  return Math.round(100 * Math.max(0, Math.min(1, normalized))) / 100;
}
export async function POST(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = (await request.json()) as {
      embedding?: unknown;
      threshold?: unknown;
    },
    embedding = body.embedding,
    threshold = Math.min(0.9, Math.max(0.5, Number(body.threshold) || 0.55));
  if (!validEmbedding(embedding))
    return Response.json(
      { message: "ข้อมูลใบหน้าไม่ถูกต้อง" },
      { status: 400 },
    );
  const [rows] = await db.execute<SampleRow[]>(
    `SELECT fs.student_id studentId,s.student_code studentCode,s.full_name studentName,COALESCE(c.name,'ยังไม่ระบุ') className,fs.embedding FROM face_samples fs JOIN face_data fd ON fd.student_id=fs.student_id AND fd.status='READY' JOIN students s ON s.id=fs.student_id AND s.status='ACTIVE' LEFT JOIN classrooms c ON c.id=s.class_id`,
  );
  let best: SampleRow | null = null,
    bestSimilarity = 0;
  for (const row of rows) {
    const stored =
      typeof row.embedding === "string"
        ? JSON.parse(row.embedding)
        : row.embedding;
    if (!validEmbedding(stored)) continue;
    const score = similarity(embedding, stored);
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
