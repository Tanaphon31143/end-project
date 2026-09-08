import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { CheckInRecord } from "@/components/admin/check-in/types";
import { getAdminSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { faceSimilarity, isFaceEmbedding } from "@/lib/face-match";
export const runtime = "nodejs";
type SessionRow = RowDataPacket & {
  id: number;
  subjectId: number;
  classroomId: number;
  sessionDate: string;
  lateAfter: string;
  status: "ACTIVE" | "CLOSED";
};
type SampleRow = RowDataPacket & {
  studentId: number;
  studentCode: string;
  studentName: string;
  className: string;
  embedding: string | number[];
};
export async function GET(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const sessionId = Number(new URL(request.url).searchParams.get("sessionId"));
  if (!Number.isInteger(sessionId) || sessionId < 1)
    return Response.json({ message: "ไม่พบรอบเช็คชื่อ" }, { status: 400 });
  const [rows] = await db.execute<(RowDataPacket & CheckInRecord)[]>(
    `SELECT a.id,a.student_id studentId,s.student_code studentCode,s.full_name studentName,c.name className,TIME_FORMAT(a.check_in_time,'%H:%i:%s') checkInTime,CASE a.status WHEN 'LATE' THEN 'สาย' ELSE 'มาเรียน' END status,CAST(a.confidence AS DECIMAL(5,2)) confidence FROM attendance_records a JOIN students s ON s.id=a.student_id LEFT JOIN classrooms c ON c.id=s.class_id WHERE a.check_in_session_id=? ORDER BY a.check_in_time DESC`,
    [sessionId],
  );
  return Response.json({ records: rows });
}
export async function POST(request: Request) {
  if (!(await getAdminSession()))
    return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const body = (await request.json()) as {
      sessionId?: unknown;
      embedding?: unknown;
    },
    sessionId = Number(body.sessionId),
    embedding = body.embedding;
  if (
    !Number.isInteger(sessionId) ||
    sessionId < 1 ||
    !isFaceEmbedding(embedding)
  )
    return Response.json(
      { message: "ข้อมูลการสแกนไม่ถูกต้อง" },
      { status: 400 },
    );
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [sessionRows] = await connection.execute<SessionRow[]>(
      "SELECT id,subject_id subjectId,classroom_id classroomId,DATE_FORMAT(session_date,'%Y-%m-%d') sessionDate,TIME_FORMAT(late_after,'%H:%i:%s') lateAfter,status FROM check_in_sessions WHERE id=? FOR UPDATE",
      [sessionId],
    );
    const session = sessionRows[0];
    if (!session || session.status !== "ACTIVE") {
      await connection.rollback();
      return Response.json(
        { message: "รอบเช็คชื่อไม่ได้เปิดใช้งาน" },
        { status: 409 },
      );
    }
    const [samples] = await connection.execute<SampleRow[]>(
      `SELECT fs.student_id studentId,s.student_code studentCode,s.full_name studentName,c.name className,fs.embedding FROM face_samples fs JOIN face_data fd ON fd.student_id=fs.student_id AND fd.status='READY' JOIN students s ON s.id=fs.student_id AND s.status='ACTIVE' AND s.class_id=? JOIN classrooms c ON c.id=s.class_id`,
      [session.classroomId],
    );
    let best: SampleRow | null = null,
      bestSimilarity = 0;
    for (const sample of samples) {
      const stored =
        typeof sample.embedding === "string"
          ? JSON.parse(sample.embedding)
          : sample.embedding;
      if (!isFaceEmbedding(stored)) continue;
      const score = faceSimilarity(embedding, stored);
      if (score > bestSimilarity) {
        best = sample;
        bestSimilarity = score;
      }
    }
    const threshold = 0.55;
    if (!best || bestSimilarity < threshold) {
      await connection.rollback();
      return Response.json(
        {
          matched: false,
          similarity: bestSimilarity,
          threshold,
          message: "ไม่พบข้อมูลใบหน้าที่ตรงกันในห้องเรียนนี้",
        },
        { status: 422 },
      );
    }
    const [existing] = await connection.execute<
      (RowDataPacket & {
        id: number;
        checkInTime: string;
        status: string;
        confidence: number;
      })[]
    >(
      "SELECT id,TIME_FORMAT(check_in_time,'%H:%i:%s') checkInTime,status,confidence FROM attendance_records WHERE student_id=? AND subject_id=? AND attendance_date=? LIMIT 1",
      [best.studentId, session.subjectId, session.sessionDate],
    );
    if (existing[0]) {
      await connection.rollback();
      return Response.json({
        matched: true,
        alreadyCheckedIn: true,
        similarity: bestSimilarity,
        student: {
          id: best.studentId,
          code: best.studentCode,
          name: best.studentName,
          className: best.className,
        },
        record: {
          ...existing[0],
          status: existing[0].status === "LATE" ? "สาย" : "มาเรียน",
        },
      });
    }
    const [nowRows] = await connection.execute<
        (RowDataPacket & { time: string })[]
      >("SELECT TIME_FORMAT(CURRENT_TIME,'%H:%i:%s') time"),
      time = nowRows[0].time,
      status = time > session.lateAfter ? "LATE" : "PRESENT",
      confidence = Math.round(bestSimilarity * 10000) / 100;
    const [result] = await connection.execute<ResultSetHeader>(
      "INSERT INTO attendance_records(student_id,subject_id,check_in_session_id,attendance_date,check_in_time,status,confidence) VALUES(?,?,?,?,CURRENT_TIMESTAMP,?,?)",
      [
        best.studentId,
        session.subjectId,
        sessionId,
        session.sessionDate,
        status,
        confidence,
      ],
    );
    await connection.commit();
    return Response.json({
      matched: true,
      alreadyCheckedIn: false,
      similarity: bestSimilarity,
      student: {
        id: best.studentId,
        code: best.studentCode,
        name: best.studentName,
        className: best.className,
      },
      record: {
        id: result.insertId,
        checkInTime: time,
        status: status === "LATE" ? "สาย" : "มาเรียน",
        confidence,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Face check-in failed", error);
    return Response.json(
      { message: "ไม่สามารถบันทึกการเช็คชื่อได้" },
      { status: 500 },
    );
  } finally {
    connection.release();
  }
}
