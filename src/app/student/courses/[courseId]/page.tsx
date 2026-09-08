import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Camera,
  CheckCircle2,
  Clock,
  DoorOpen,
  GraduationCap,
  Percent,
  ShieldAlert,
  UserCheck,
  XCircle,
  AlertCircle,
  UserRound,
} from "lucide-react";
import { Badge, PageTitle } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { getStudentCourseDetail } from "@/lib/student-data";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const resolvedParams = await params;
  const courseId = Number(resolvedParams.courseId);

  if (!Number.isInteger(courseId) || courseId < 1) {
    return (
      <div className="card not-authorized-card">
        <ShieldAlert size={48} className="danger-icon" />
        <h2>ไม่พบข้อมูลรายวิชา</h2>
        <p>รหัสรายวิชาไม่ถูกต้องหรือไม่พบในระบบ</p>
        <Link href="/student/courses" className="button primary">
          <ArrowLeft size={16} /> กลับหน้ารายวิชาของฉัน
        </Link>
      </div>
    );
  }

  const { authorized, course } = await getStudentCourseDetail(
    session.id,
    courseId,
  );

  if (!authorized || !course) {
    return (
      <div className="card not-authorized-card">
        <ShieldAlert size={48} className="danger-icon" />
        <h2>ไม่มีสิทธิ์เข้าถึงรายวิชานี้ (403 Forbidden)</h2>
        <p>
          คุณสามารถเข้าดูได้เฉพาะรายวิชาที่ลงทะเบียนเรียนในห้องเรียนของคุณเท่านั้น
        </p>
        <Link href="/student/courses" className="button primary">
          <ArrowLeft size={16} /> กลับไปยังรายวิชาของฉัน
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="course-detail-top">
        <Link href="/student/courses" className="button secondary back-link">
          <ArrowLeft size={16} /> กลับหน้ารายวิชา
        </Link>
      </div>

      <PageTitle
        eyebrow={`ภาคเรียนที่ ${course.semester} ปีการศึกษา ${course.academicYear}`}
        title={`${course.code} ${course.name}`}
        description={`ระดับชั้น ${course.gradeLevel || "ทั่วไป"} · ${course.credits} หน่วยกิต`}
      />

      {/* Active Check-In Session Banner */}
      {course.activeSession && (
        <section className="card active-session-banner">
          <div className="active-session-icon">
            <Camera size={28} />
          </div>
          <div className="active-session-body">
            <div className="active-session-tag">
              <span className="live-dot" /> กำลังเปิดเช็คชื่อ
            </div>
            <h3>คาบเรียนนี้กำลังเปิดให้สแกนใบหน้าเช็คชื่อ</h3>
            <p>
              เวลาเปิด {course.activeSession.startTime} –{" "}
              {course.activeSession.endTime} น. (สายหลัง{" "}
              {course.activeSession.lateAfter} น.)
            </p>
          </div>
          <div className="active-session-action">
            {course.activeSession.alreadyCheckedIn ? (
              <span className="badge success checkin-done-badge">
                <CheckCircle2 size={16} /> คุณเช็คชื่อในคาบนี้แล้ว
              </span>
            ) : (
              <Link
                href={`/student/attendance/scan?sessionId=${course.activeSession.id}`}
                className="button primary scan-now-btn"
              >
                <Camera size={18} /> ไปหน้าสแกนใบหน้า
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Course Info Cards Grid */}
      <div className="grid course-detail-grid">
        <section className="card card-pad course-info-card">
          <div className="section-label">
            <BookOpen size={20} />
            <h2>ข้อมูลรายวิชา</h2>
          </div>
          <div className="info-list">
            <div className="info-row">
              <span>รหัสวิชา</span>
              <strong>{course.code}</strong>
            </div>
            <div className="info-row">
              <span>ชื่อวิชา</span>
              <strong>{course.name}</strong>
            </div>
            <div className="info-row">
              <span>ครูผู้สอน</span>
              <strong>{course.teacher}</strong>
            </div>
            <div className="info-row">
              <span>ห้องเรียน / สถานที่</span>
              <strong>{course.room}</strong>
            </div>
            <div className="info-row">
              <span>วันและเวลาเรียน</span>
              <strong>
                {course.days.length
                  ? `${course.days.join(", ")} ${course.startTime}–${course.endTime}`
                  : "ยังไม่กำหนด"}
              </strong>
            </div>
            <div className="info-row">
              <span>หน่วยกิต</span>
              <strong>{course.credits}</strong>
            </div>
            {course.description && (
              <div className="info-row description-row">
                <span>คำอธิบายรายวิชา</span>
                <p>{course.description}</p>
              </div>
            )}
          </div>
        </section>

        {/* Attendance Statistics for this course */}
        <section className="card card-pad course-stats-card">
          <div className="section-label">
            <Percent size={20} />
            <h2>สถิติการเข้าเรียนในวิชานี้</h2>
          </div>

          <div className="course-rate-box">
            <div className="course-rate-val">{course.stats.rate}%</div>
            <span>เปอร์เซ็นต์การเข้าเรียน</span>
            <small>
              คำนวณจาก (มาเรียน + มาสาย) / คาบเรียนทั้งหมดที่มีการบันทึก
            </small>
          </div>

          <div className="course-stats-breakdown">
            <div className="stat-pill present">
              <span>มาเรียน</span>
              <strong>{course.stats.present} ครั้ง</strong>
            </div>
            <div className="stat-pill late">
              <span>มาสาย</span>
              <strong>{course.stats.late} ครั้ง</strong>
            </div>
            <div className="stat-pill absent">
              <span>ขาดเรียน</span>
              <strong>{course.stats.absent} ครั้ง</strong>
            </div>
            <div className="stat-pill leave">
              <span>ลา</span>
              <strong>{course.stats.leave} ครั้ง</strong>
            </div>
            <div className="stat-pill total">
              <span>จำนวนคาบทั้งหมด</span>
              <strong>{course.stats.total} ครั้ง</strong>
            </div>
          </div>
        </section>
      </div>

      {/* Recent Attendance Records for this subject */}
      <section className="card card-pad course-attendance-history">
        <div className="section-head">
          <div>
            <h2>ประวัติการเข้าเรียนล่าสุดในวิชานี้</h2>
            <p>บันทึกการเช็คชื่อย้อนหลังของรายวิชา {course.name}</p>
          </div>
        </div>

        {course.recentAttendance.length === 0 ? (
          <div className="table-empty">
            <Clock size={36} />
            <p>ยังไม่มีประวัติการเช็คชื่อในรายวิชานี้</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เวลาเช็คชื่อ</th>
                  <th>สถานะ</th>
                  <th>ความแม่นยำใบหน้า</th>
                </tr>
              </thead>
              <tbody>
                {course.recentAttendance.map((rec) => (
                  <tr key={rec.id}>
                    <td>{rec.date}</td>
                    <td>{rec.checkIn}</td>
                    <td>
                      <Badge>{rec.status}</Badge>
                    </td>
                    <td>
                      {rec.confidence !== null ? `${rec.confidence}%` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
