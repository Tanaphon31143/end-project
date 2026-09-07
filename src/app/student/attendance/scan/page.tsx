import { redirect } from "next/navigation";
import { Clock3, DoorOpen, ShieldCheck, UserRound } from "lucide-react";
import FaceScanner, {
  type StudentCheckInSession,
} from "@/components/student/FaceScanner";
import { PageTitle } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
export const dynamic = "force-dynamic";
async function getActive(studentId: number) {
  const [rows] = await db.execute<(RowDataPacket & StudentCheckInSession)[]>(
    `SELECT cs.id,cs.subject_id subjectId,sb.subject_code subjectCode,sb.subject_name subjectName,COALESCE(t.full_name,'ยังไม่กำหนด') teacherName,COALESCE(sb.location,c.name,'ยังไม่ระบุ') room,DATE_FORMAT(cs.session_date,'%Y-%m-%d') sessionDate,TIME_FORMAT(cs.start_time,'%H:%i') startTime,TIME_FORMAT(cs.end_time,'%H:%i') endTime,TIME_FORMAT(cs.late_after,'%H:%i:%s') lateAfter,cs.status FROM check_in_sessions cs JOIN subjects sb ON sb.id=cs.subject_id JOIN classrooms c ON c.id=cs.classroom_id JOIN students st ON st.class_id=cs.classroom_id LEFT JOIN teachers t ON t.id=sb.teacher_id WHERE st.id=? AND cs.session_date=CURRENT_DATE AND cs.status='ACTIVE' AND CURRENT_TIME<=cs.end_time ORDER BY cs.start_time LIMIT 1`,
    [studentId],
  );
  return rows[0] || null;
}
export default async function Scan() {
  const student = await getStudentSession();
  if (!student) redirect("/");
  const active = await getActive(student.id);
  return (
    <>
      <PageTitle
        eyebrow="เช็คชื่อด้วยใบหน้า"
        title="สแกนใบหน้าเพื่อเช็คชื่อ"
        description="อนุญาตการใช้งานกล้องและจัดใบหน้าให้อยู่ในกรอบ"
      />
      <div className="grid scan-layout">
        <section className="card card-pad">
          <FaceScanner initialSession={active} />
        </section>
        <aside className="grid scan-side">
          <section className="card class-live">
            <div className="live-label">
              <i /> {active ? "คาบเรียนเปิดอยู่" : "ไม่มีคาบเรียนที่เปิดอยู่"}
            </div>
            <span>วิชาที่กำลังเรียน</span>
            <h2>{active?.subjectName || "ยังไม่มีคาบเรียน"}</h2>
            <p>
              {active?.subjectCode || "ระบบจะอัปเดตเมื่อครูเปิดรอบเช็คชื่อ"}
            </p>
            <div className="class-facts">
              <span>
                <UserRound size={18} />
                <small>
                  ครูผู้สอน<b>{active?.teacherName || "-"}</b>
                </small>
              </span>
              <span>
                <DoorOpen size={18} />
                <small>
                  ห้องเรียน<b>{active?.room || "-"}</b>
                </small>
              </span>
              <span>
                <Clock3 size={18} />
                <small>
                  เวลาเปิดเช็คชื่อ
                  <b>{active ? `${active.startTime} น.` : "-"}</b>
                </small>
              </span>
              <span>
                <Clock3 size={18} />
                <small>
                  เวลาปิดเช็คชื่อ<b>{active ? `${active.endTime} น.` : "-"}</b>
                </small>
              </span>
            </div>
          </section>
          <section className="card scan-security">
            <ShieldCheck size={23} />
            <div>
              <strong>เช็คชื่อได้ 1 ครั้งต่อคาบ</strong>
              <p>ระบบตรวจบัญชี ห้องเรียน เวลา และใบหน้าก่อนบันทึกทุกครั้ง</p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
