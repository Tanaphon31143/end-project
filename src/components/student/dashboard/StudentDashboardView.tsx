import Image from "next/image";
import Link from "next/link";
import {
  BellRing,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  FileText,
  GraduationCap,
  IdCard,
  Megaphone,
  Percent,
  ScanFace,
  UserRound,
  UserX,
} from "lucide-react";
import type { AppNotification } from "@/lib/notifications";
import type { StudentDashboardData, StudentStats } from "@/lib/student-data";
import { Badge, StatCard } from "@/components/student/UI";
import DashboardDateTime from "./DashboardDateTime";

type Props = {
  dashboard: StudentDashboardData;
  notifications: AppNotification[];
  statsDetail: StudentStats;
};

function statusTone(status: "มาเรียน" | "สาย" | "ขาด" | "ลา") {
  return status === "มาเรียน" ? "success" : status === "สาย" ? "warning" : status === "ขาด" ? "danger" : "purple";
}

function attendanceBreakdown(stats: StudentDashboardData["stats"]) {
  const total = stats.total || 1;
  return [
    { label: "มาเรียน", value: stats.present, tone: "present", percent: (stats.present / total) * 100 },
    { label: "มาสาย", value: stats.late, tone: "late", percent: (stats.late / total) * 100 },
    { label: "ขาด", value: stats.absent, tone: "absent", percent: (stats.absent / total) * 100 },
    { label: "ลา", value: stats.leave, tone: "leave", percent: (stats.leave / total) * 100 },
  ];
}

export default function StudentDashboardView({ dashboard, notifications, statsDetail }: Props) {
  const { student, stats, term, today, recent } = dashboard;
  const breakdown = attendanceBreakdown(stats);
  const topSubjects = statsDetail.subjects.slice(0, 3);
  const profileComplete = student.className !== "ยังไม่ระบุ" && Boolean(student.code);

  return (
    <div className="student-dashboard dashboard-refresh">
      <section className="dashboard-welcome" aria-labelledby="dashboard-welcome-title">
        <div className="dashboard-welcome-copy">
          <h1 id="dashboard-welcome-title">สวัสดี, {student.name} <span aria-hidden="true">👋</span></h1>
          <span>{student.className} · รหัสนักเรียน {student.code}</span>
        </div>
        <div className="dashboard-school-mark" aria-hidden="true">
          <Image src="/school-logo.jpg" alt="" width={112} height={112} />
        </div>
        <DashboardDateTime />
      </section>

      <section className="dashboard-profile card" aria-labelledby="dashboard-profile-title">
        <div className="dashboard-profile-photo">
          {student.hasProfileImage ? (
            <Image src="/api/student/profile-image" alt={`รูปของ ${student.name}`} width={150} height={150} sizes="150px" unoptimized priority />
          ) : (
            <span>{student.name.slice(0, 2)}</span>
          )}
          <span className="dashboard-photo-badge"><ScanFace size={18} /></span>
        </div>
        <div className="dashboard-profile-main">
          <span className="dashboard-profile-kicker">นักเรียน</span>
          <h2 id="dashboard-profile-title">{student.name}</h2>
          <p>ภาคเรียนที่ {term.semester} ปีการศึกษา {term.academicYear}</p>
          <div className="dashboard-profile-facts">
            <span><GraduationCap size={20} /><small>ระดับชั้น</small><b>{student.className}</b></span>
            <span><IdCard size={20} /><small>รหัสนักเรียน</small><b>{student.code}</b></span>
            <span><CircleCheckBig size={20} /><small>สถานะข้อมูล</small><b>{profileComplete ? "ครบถ้วน" : "รอตรวจสอบ"}</b></span>
          </div>
        </div>
        <div className={`dashboard-face-status ${student.faceReady ? "is-ready" : "is-pending"}`}>
          <div><ScanFace size={26} /><span>ข้อมูลใบหน้า</span></div>
          <strong>{student.faceReady ? "ลงทะเบียนแล้ว" : "ยังไม่ลงทะเบียน"}</strong>
          <Link href="/student/profile"><UserRound size={17} /> ดูข้อมูลส่วนตัว <ChevronRight size={17} /></Link>
        </div>
      </section>

      <section className="grid dashboard-stats-grid" aria-label="สถิติการเข้าเรียน">
        <StatCard label="รายวิชาที่เรียน" value={stats.subjects} detail="ภาคเรียนนี้" icon={BookOpen} />
        <StatCard label="มาเรียน" value={stats.present} detail={`จาก ${stats.total} คาบ`} icon={CalendarCheck} tone="green" />
        <StatCard label="มาสาย" value={stats.late} detail={`${stats.total ? ((stats.late * 100) / stats.total).toFixed(1) : 0}% ของทั้งหมด`} icon={Clock3} tone="orange" />
        <StatCard label="ขาด / ลา" value={`${stats.absent} / ${stats.leave}`} detail={`รวม ${stats.absent + stats.leave} คาบ`} icon={UserX} tone="red" />
        <StatCard label="อัตราเข้าเรียน" value={`${stats.rate}%`} detail={stats.rate >= 80 ? "อยู่ในเกณฑ์ดี" : "ควรปรับปรุง"} icon={Percent} tone="purple" />
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel card">
          <header className="dashboard-panel-head">
            <div><span className="dashboard-head-icon"><CalendarDays size={21} /></span><div><h2>ตารางเรียนวันนี้</h2><p>รายวิชาตามตารางเรียนของคุณ</p></div></div>
            <Link href="/student/courses">ดูทั้งหมด <ChevronRight size={16} /></Link>
          </header>
          <div className="dashboard-schedule-list">
            {today.length ? today.map((course) => (
              <article key={course.id}>
                <time>{course.startTime}</time><span className="schedule-dot" />
                <div><strong>{course.name}</strong><p>{course.teacher} · {course.room}</p></div>
                <span className="schedule-end">{course.endTime}</span>
              </article>
            )) : <p className="dashboard-empty">ไม่มีตารางเรียนวันนี้</p>}
          </div>
        </article>

        <article className="dashboard-panel card">
          <header className="dashboard-panel-head">
            <div><span className="dashboard-head-icon"><FileText size={21} /></span><div><h2>การเช็คชื่อล่าสุด</h2><p>รายการเช็คชื่อของคุณ</p></div></div>
            <Link href="/student/attendance/history">ดูประวัติ <ChevronRight size={16} /></Link>
          </header>
          <div className="dashboard-attendance-list">
            {recent.length ? recent.map((item) => (
              <article key={item.id}>
                <span className={`attendance-file ${statusTone(item.status)}`}><FileText size={17} /></span>
                <div><strong>{item.subject}</strong><p>{item.date} · เช็คชื่อ {item.checkIn}</p></div>
                <Badge>{item.status}</Badge><ChevronRight size={17} className="attendance-arrow" />
              </article>
            )) : <p className="dashboard-empty">ยังไม่มีประวัติการเช็คชื่อ</p>}
          </div>
        </article>
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-panel dashboard-compact-panel card">
          <header className="dashboard-panel-head"><div><span className="dashboard-head-icon news"><Megaphone size={20} /></span><div><h2>ข่าวสารจากโรงเรียน</h2><p>ประกาศและข่าวสารล่าสุด</p></div></div></header>
          <div className="dashboard-empty dashboard-news-empty"><Megaphone size={22} /><span>ยังไม่มีประกาศจากโรงเรียนในขณะนี้</span></div>
        </article>
        <article className="dashboard-panel dashboard-compact-panel card">
          <header className="dashboard-panel-head"><div><span className="dashboard-head-icon alert"><BellRing size={20} /></span><div><h2>การแจ้งเตือน</h2><p>รายการแจ้งเตือนของคุณ</p></div></div><Link href="/student/notifications">ดูทั้งหมด <ChevronRight size={16} /></Link></header>
          <div className="dashboard-notification-list">
            {notifications.length ? notifications.slice(0, 2).map((notice) => <article key={notice.id}><span className={!notice.isRead ? "is-unread" : ""} /><div><strong>{notice.title}</strong><p>{notice.message}</p></div></article>) : <p className="dashboard-empty">ไม่มีการแจ้งเตือนใหม่</p>}
          </div>
        </article>
        <article className="dashboard-panel dashboard-compact-panel card">
          <header className="dashboard-panel-head"><div><span className="dashboard-head-icon is-chart"><ChartNoAxesCombined size={20} /></span><div><h2>สถิติการเข้าเรียน</h2><p>สรุปจากข้อมูลจริง</p></div></div><Link href="/student/attendance/statistics">ดูรายละเอียด <ChevronRight size={16} /></Link></header>
          <div className="dashboard-breakdown" aria-label="สัดส่วนสถิติการเข้าเรียน">
            {breakdown.map((item) => <div key={item.tone}><span><i className={item.tone} />{item.label}</span><b>{item.value}</b><em><i className={item.tone} style={{ width: `${item.percent}%` }} /></em></div>)}
          </div>
          {topSubjects.length > 0 && <p className="dashboard-subject-note">ติดตามสถิติรายวิชาได้ {topSubjects.length} รายวิชา</p>}
        </article>
      </section>
    </div>
  );
}
