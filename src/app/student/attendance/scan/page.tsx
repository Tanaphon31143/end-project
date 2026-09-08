import { redirect } from "next/navigation";
import { Clock3, DoorOpen, ShieldCheck, UserRound, AlertCircle } from "lucide-react";
import FaceScanner, {
  type StudentCheckInSession,
} from "@/components/student/FaceScanner";
import { PageTitle } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

type SessionRow = RowDataPacket & {
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
  alreadyCheckedIn: number;
  remainingSeconds: number;
};

async function getAllActiveSessions(studentId: number): Promise<StudentCheckInSession[]> {
  const [rows] = await db.execute<SessionRow[]>(
    `SELECT cs.id,
            cs.subject_id subjectId,
            sb.subject_code subjectCode,
            sb.subject_name subjectName,
            COALESCE(t.full_name, 'ยังไม่กำหนด') teacherName,
            COALESCE(sb.location, c.name, 'ยังไม่ระบุ') room,
            DATE_FORMAT(cs.session_date, '%Y-%m-%d') sessionDate,
            TIME_FORMAT(cs.start_time, '%H:%i') startTime,
            TIME_FORMAT(cs.end_time, '%H:%i') endTime,
            TIME_FORMAT(cs.late_after, '%H:%i:%s') lateAfter,
            cs.status,
            EXISTS(
              SELECT 1 FROM attendance_records a
              WHERE a.student_id = ? AND a.check_in_session_id = cs.id
            ) alreadyCheckedIn,
            TIMESTAMPDIFF(SECOND, CURRENT_TIME, cs.end_time) remainingSeconds
     FROM check_in_sessions cs
     JOIN subjects sb ON sb.id = cs.subject_id
     JOIN classrooms c ON c.id = cs.classroom_id
     JOIN students st ON st.class_id = cs.classroom_id
     LEFT JOIN teachers t ON t.id = sb.teacher_id
     WHERE st.id = ?
       AND cs.session_date = CURRENT_DATE
       AND cs.status = 'ACTIVE'
       AND CURRENT_TIME <= cs.end_time
     ORDER BY cs.start_time`,
    [studentId, studentId],
  );

  return rows.map((r) => ({
    id: r.id,
    subjectId: r.subjectId,
    subjectCode: r.subjectCode,
    subjectName: r.subjectName,
    teacherName: r.teacherName,
    room: r.room,
    sessionDate: r.sessionDate,
    startTime: r.startTime,
    endTime: r.endTime,
    lateAfter: r.lateAfter,
    status: r.status,
    alreadyCheckedIn: Boolean(r.alreadyCheckedIn),
    remainingSeconds: Math.max(0, Number(r.remainingSeconds) || 0),
  }));
}

export default async function ScanPage({
  searchParams,
}: {
  searchParams?: Promise<{ sessionId?: string }>;
}) {
  const student = await getStudentSession();
  if (!student) redirect("/");

  const resolvedParams = searchParams ? await searchParams : undefined;
  const preferredSessionId = resolvedParams?.sessionId
    ? Number(resolvedParams.sessionId)
    : undefined;

  const activeSessions = await getAllActiveSessions(student.id);

  return (
    <>
      <PageTitle
        eyebrow="เช็คชื่อด้วยใบหน้า"
        title="สแกนใบหน้าเพื่อเช็คชื่อ"
        description="เลือกคาบเรียน ตรวจสอบความถูกต้อง และสแกนใบหน้าเพื่อบันทึกเวลาเรียน"
      />

      <div className="grid scan-layout">
        <section className="card card-pad">
          <FaceScanner
            initialSessions={activeSessions}
            preferredSessionId={preferredSessionId}
          />
        </section>

        <aside className="grid scan-side">
          <section className="card class-live">
            <div className="live-label">
              <i />{" "}
              {activeSessions.length > 0
                ? `มี ${activeSessions.length} คาบเรียนเปิดอยู่`
                : "ไม่มีคาบเรียนที่เปิดอยู่"}
            </div>

            {activeSessions.length > 0 ? (
              <div className="live-summary">
                <span>คาบเรียนวันนี้</span>
                <h2>{activeSessions[0].subjectName}</h2>
                <p>{activeSessions[0].subjectCode}</p>

                <div className="class-facts">
                  <span>
                    <UserRound size={18} />
                    <small>
                      ครูผู้สอน <b>{activeSessions[0].teacherName}</b>
                    </small>
                  </span>
                  <span>
                    <DoorOpen size={18} />
                    <small>
                      ห้องเรียน <b>{activeSessions[0].room}</b>
                    </small>
                  </span>
                  <span>
                    <Clock3 size={18} />
                    <small>
                      เวลาเปิดเช็คชื่อ <b>{activeSessions[0].startTime} น.</b>
                    </small>
                  </span>
                  <span>
                    <Clock3 size={18} />
                    <small>
                      เวลาปิดเช็คชื่อ <b>{activeSessions[0].endTime} น.</b>
                    </small>
                  </span>
                </div>
              </div>
            ) : (
              <div className="no-live-box">
                <AlertCircle size={32} />
                <p>ขณะนี้ยังไม่มีคาบเรียนที่เปิดเช็คชื่อ</p>
                <small>เมื่อครูผู้สอนเปิดระบบเช็คชื่อ คาบเรียนจะปรากฏที่นี่</small>
              </div>
            )}
          </section>

          <section className="card scan-security">
            <ShieldCheck size={24} />
            <div>
              <strong>มาตรการความปลอดภัยชีวมิติ</strong>
              <p>
                ระบบจำกัดการสแกนผิดพลาดไม่เกิน 5 ครั้ง มีการตรวจสอบบุคคลจริง (Liveness Detection)
                และตรวจสอบสิทธิ์ตามห้องเรียนที่ลงทะเบียนอย่างเข้มงวด
              </p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
