import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";

export type StudentCheckInSession = {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  room: string;
  periodName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  lateAfter: string;
  status: "ACTIVE" | "CLOSED";
  alreadyCheckedIn: boolean;
  remainingSeconds: number;
  isOpenNow: boolean;
  availability: "UPCOMING" | "OPEN" | "ENDED";
};

type SessionRow = RowDataPacket & Omit<StudentCheckInSession, "alreadyCheckedIn"> & {
  alreadyCheckedIn: number;
};

export async function getActiveSessionsForStudent(
  studentId: number,
  sessionId?: number,
): Promise<StudentCheckInSession[]> {
  return getStudentSessionsForToday(studentId, sessionId, true);
}

/**
 * Returns today's teacher-opened sessions even before their check-in window starts.
 * The UI can therefore show the subject and its opening time, while the scan API
 * continues to accept check-ins only during the configured time window.
 */
export async function getTodaySessionsForStudent(
  studentId: number,
): Promise<StudentCheckInSession[]> {
  return getStudentSessionsForToday(studentId, undefined, false);
}

async function getStudentSessionsForToday(
  studentId: number,
  sessionId: number | undefined,
  onlyOpenNow: boolean,
): Promise<StudentCheckInSession[]> {
  const params: number[] = [studentId, studentId];
  const sessionFilter = sessionId ? " AND cs.id = ?" : "";
  const openNowFilter = onlyOpenNow
    ? " AND TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')) BETWEEN cs.start_time AND cs.end_time"
    : "";
  if (sessionId) params.push(sessionId);

  const [rows] = await db.execute<SessionRow[]>(
    `SELECT cs.id,
            cs.subject_id subjectId,
            sb.subject_code subjectCode,
            sb.subject_name subjectName,
            COALESCE(t.full_name, 'ยังไม่กำหนด') teacherName,
            COALESCE(sb.location, c.name, 'ยังไม่ระบุ') room,
            COALESCE(sc.period_name, 'คาบเรียน') periodName,
            DATE_FORMAT(cs.session_date, '%Y-%m-%d') sessionDate,
            TIME_FORMAT(cs.start_time, '%H:%i') startTime,
            TIME_FORMAT(cs.end_time, '%H:%i') endTime,
            TIME_FORMAT(cs.late_after, '%H:%i:%s') lateAfter,
            cs.status,
            EXISTS(
              SELECT 1 FROM attendance_records a
              WHERE a.student_id = ? AND a.check_in_session_id = cs.id
            ) alreadyCheckedIn,
            TIMESTAMPDIFF(SECOND, TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')), cs.end_time) remainingSeconds,
            TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')) BETWEEN cs.start_time AND cs.end_time isOpenNow,
            CASE
              WHEN TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')) < cs.start_time THEN 'UPCOMING'
              WHEN TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')) > cs.end_time THEN 'ENDED'
              ELSE 'OPEN'
            END availability
     FROM check_in_sessions cs
     JOIN subjects sb ON sb.id = cs.subject_id
     JOIN classrooms c ON c.id = cs.classroom_id
     JOIN students st ON st.class_id = cs.classroom_id
     LEFT JOIN teachers t ON t.id = sb.teacher_id
     LEFT JOIN schedules sc ON sc.id = cs.schedule_id
     WHERE st.id = ?
       AND cs.session_date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))
       AND cs.status = 'ACTIVE'
       ${openNowFilter}
       ${sessionFilter}
     ORDER BY cs.start_time, cs.id`,
    params,
  );

  return rows.map((row) => ({
    ...row,
    alreadyCheckedIn: Boolean(row.alreadyCheckedIn),
    remainingSeconds: Math.max(0, Number(row.remainingSeconds) || 0),
    isOpenNow: Boolean(row.isOpenNow),
    availability: row.availability,
  }));
}
