import {
  BookOpen,
  Clock3,
  UserCheck,
  UserMinus,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { DashboardHero } from "@/components/teacher/DashboardHero";
import { StatCard } from "@/components/teacher/StatCard";
import { TodayAttendance } from "@/components/teacher/TodayAttendance";
import { WeeklyAttendanceChart } from "@/components/teacher/WeeklyAttendanceChart";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherDashboard, getTeacherIdentity } from "@/lib/teacher-data";

const safeNumber = (value: number | undefined | null) =>
  Number.isFinite(value) ? String(value) : "0";
const attendanceDetail = (value?: string | null) =>
  (value || "0.0% วันนี้").replace("วันนี้", "จากทั้งหมด");

export default async function TeacherDashboard() {
  const session = await getTeacherSession();
  if (!session) return null;
  const [data, identity] = await Promise.all([
    getTeacherDashboard(session.id),
    getTeacherIdentity(session.id),
  ]);
  if (!identity) return null;
  const date = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeZone: "Asia/Bangkok",
  }).format(new Date());

  return (
    <div className="dashboard-page">
      <DashboardHero identity={identity} date={date} />
      <section className="stats-grid dashboard-stats" aria-label="สรุปการเข้าเรียนวันนี้">
        <StatCard label="รายวิชาที่สอน" value={safeNumber(data.courses)} detail="รายวิชาที่เปิดสอนในภาคเรียนนี้" tone="blue" icon={BookOpen} />
        <StatCard label="นักเรียนทั้งหมด" value={safeNumber(data.students)} detail="นักเรียนในรายวิชาที่สอน" tone="blue" icon={UsersRound} />
        <StatCard label="เข้าเรียนวันนี้" value={safeNumber(data.counts?.PRESENT)} detail={attendanceDetail(data.details?.present)} tone="green" icon={UserRoundCheck} />
        <StatCard label="มาสายวันนี้" value={safeNumber(data.counts?.LATE)} detail={attendanceDetail(data.details?.late)} tone="yellow" icon={Clock3} />
        <StatCard label="ขาดเรียนวันนี้" value={safeNumber(data.counts?.ABSENT)} detail={attendanceDetail(data.details?.absent)} tone="red" icon={UserMinus} />
        <StatCard label="ลาเรียนวันนี้" value={safeNumber(data.counts?.LEAVE)} detail={attendanceDetail(data.details?.leave)} tone="gray" icon={UserCheck} />
      </section>
      <div className="dashboard-grid dashboard-content-grid">
        <TodayAttendance sessions={data.sessions} />
        <WeeklyAttendanceChart data={data.chart} students={data.students} summary={data.weeklySummary} />
      </div>
    </div>
  );
}
