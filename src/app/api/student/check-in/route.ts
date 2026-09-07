import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { faceSimilarity, isFaceEmbedding } from "@/lib/face-match";
export const runtime = "nodejs";
type ActiveSession = RowDataPacket & {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  room: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  lateAfter: string;
  status: "ACTIVE" | "CLOSED";
};
async function activeFor(studentId: number, sessionId?: number) {
  const params: (number | string)[] = [studentId];
  let extra = "";
  if (sessionId) {
    extra = " AND cs.id=?";
    params.push(sessionId);
  }
  const [rows] = await db.execute<ActiveSession[]>(
    `SELECT cs.id,cs.subject_id subjectId,sb.subject_code subjectCode,sb.subject_name subjectName,COALESCE(t.full_name,'ยังไม่กำหนด') teacherName,COALESCE(sb.location,c.name,'ยังไม่ระบุ') room,DATE_FORMAT(cs.session_date,'%Y-%m-%d') sessionDate,TIME_FORMAT(cs.start_time,'%H:%i') startTime,TIME_FORMAT(cs.end_time,'%H:%i') endTime,TIME_FORMAT(cs.late_after,'%H:%i:%s') lateAfter,cs.status FROM check_in_sessions cs JOIN subjects sb ON sb.id=cs.subject_id JOIN classrooms c ON c.id=cs.classroom_id JOIN students st ON st.class_id=cs.classroom_id LEFT JOIN teachers t ON t.id=sb.teacher_id WHERE st.id=? AND cs.session_date=CURRENT_DATE AND cs.status='ACTIVE' AND CURRENT_TIME<=cs.end_time${extra} ORDER BY cs.start_time LIMIT 1`,
    params,
  );
  return rows[0] || null;
}
export async function GET() {
  const student = await getStudentSession();
  if (!student)
    return Response.json(
      { message: "กรุณาเข้าสู่ระบบนักเรียน" },
      { status: 401 },
    );
  return Response.json({ session: await activeFor(student.id) });
}
export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student)
    return Response.json(
      { message: "กรุณาเข้าสู่ระบบนักเรียน" },
      { status: 401 },
    );
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
  const session = await activeFor(student.id, sessionId);
  if (!session)
    return Response.json(
      {
        message: "คาบเรียนปิดแล้วหรือไม่ใช่ห้องเรียนของคุณ",
        code: "SESSION_CLOSED",
      },
      { status: 409 },
    );
  const [samples] = await db.execute<
    (RowDataPacket & { embedding: string | number[] })[]
  >(
    `SELECT fs.embedding FROM face_samples fs JOIN face_data fd ON fd.student_id=fs.student_id AND fd.status='READY' WHERE fs.student_id=?`,
    [student.id],
  );
  if (!samples.length)
    return Response.json(
      {
        message: "ยังไม่ได้ลงทะเบียนข้อมูลใบหน้า",
        code: "FACE_NOT_REGISTERED",
      },
      { status: 422 },
    );
  let best = 0;
  for (const sample of samples) {
    try {
      const stored =
        typeof sample.embedding === "string"
          ? JSON.parse(sample.embedding)
          : sample.embedding;
      if (isFaceEmbedding(stored))
        best = Math.max(best, faceSimilarity(embedding, stored));
    } catch {
      continue;
    }
  }
  const threshold = 0.55;
  if (best < threshold)
    return Response.json(
      {
        matched: false,
        similarity: best,
        threshold,
        message: "ใบหน้าไม่ตรงกับข้อมูลที่ลงทะเบียน",
        code: "FACE_MISMATCH",
      },
      { status: 422 },
    );
  const [existing] = await db.execute<
    (RowDataPacket & {
      id: number;
      checkInTime: string;
      status: string;
      confidence: number;
    })[]
  >(
    `SELECT id,TIME_FORMAT(check_in_time,'%H:%i:%s') checkInTime,status,confidence FROM attendance_records WHERE student_id=? AND subject_id=? AND attendance_date=? LIMIT 1`,
    [student.id, session.subjectId, session.sessionDate],
  );
  if (existing[0])
    return Response.json({
      matched: true,
      alreadyCheckedIn: true,
      similarity: best,
      session,
      record: {
        ...existing[0],
        status: existing[0].status === "LATE" ? "สาย" : "มาเรียน",
      },
      message: "คุณเช็คชื่อคาบนี้แล้ว",
    });
  const [nowRows] = await db.execute<(RowDataPacket & { time: string })[]>(
      `SELECT TIME_FORMAT(CURRENT_TIME,'%H:%i:%s') time`,
    ),
    time = nowRows[0].time,
    status = time > session.lateAfter ? "LATE" : "PRESENT",
    confidence = Math.round(best * 10000) / 100;
  try {
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO attendance_records(student_id,subject_id,check_in_session_id,attendance_date,check_in_time,status,confidence) VALUES(?,?,?,?,CURRENT_TIMESTAMP,?,?)`,
      [
        student.id,
        session.subjectId,
        session.id,
        session.sessionDate,
        status,
        confidence,
      ],
    );
    return Response.json(
      {
        matched: true,
        alreadyCheckedIn: false,
        similarity: best,
        session,
        record: {
          id: result.insertId,
          checkInTime: time,
          status: status === "LATE" ? "สาย" : "มาเรียน",
          confidence,
        },
        message: "เช็คชื่อสำเร็จ",
      },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY")
      return Response.json(
        {
          matched: true,
          alreadyCheckedIn: true,
          message: "คุณเช็คชื่อคาบนี้แล้ว",
        },
        { status: 409 },
      );
    console.error("Student check-in failed", error);
    return Response.json(
      { message: "ไม่สามารถบันทึกการเช็คชื่อได้" },
      { status: 500 },
    );
  }
}
