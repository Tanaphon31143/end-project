import { BookOpen, Clock3, UserCheck, UserMinus, UserRoundCheck, UsersRound } from "lucide-react";
import { DashboardHeader } from "@/components/teacher/DashboardHeader";
import { StatCard } from "@/components/teacher/StatCard";
import { TodayAttendance } from "@/components/teacher/TodayAttendance";
import { WeeklyAttendanceChart } from "@/components/teacher/WeeklyAttendanceChart";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherDashboard } from "@/lib/teacher-data";

const safeNumber = (value: number | undefined | null) => Number.isFinite(value) ? String(value) : "0";

export default async function TeacherDashboard() {
  const session = await getTeacherSession();
  if (!session) return null;
  const data = await getTeacherDashboard(session.id);
  const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" }).format(new Date());
  return (
    <div className="dashboard-page">
      <DashboardHeader name={data.teacherName} date={date} />
      <section className="stats-grid dashboard-stats" aria-label="สรุปการเข้าเรียนวันนี้">
        <StatCard label="รายวิชาที่สอน" value={safeNumber(data.courses)} detail="รายวิชาที่เปิดใช้งาน" tone="blue" icon={BookOpen} />
        <StatCard label="นักเรียนทั้งหมด" value={safeNumber(data.students)} detail="นับแบบไม่ซ้ำ" tone="blue" icon={UsersRound} />
        <StatCard label="เข้าเรียน" value={safeNumber(data.counts?.PRESENT)} detail={data.details?.present || "0.0% วันนี้"} tone="green" icon={UserRoundCheck} />
        <StatCard label="มาสาย" value={safeNumber(data.counts?.LATE)} detail={data.details?.late || "0.0% วันนี้"} tone="yellow" icon={Clock3} />
        <StatCard label="ขาดเรียน" value={safeNumber(data.counts?.ABSENT)} detail={data.details?.absent || "0.0% วันนี้"} tone="red" icon={UserMinus} />
        <StatCard label="ลา" value={safeNumber(data.counts?.LEAVE)} detail={data.details?.leave || "0.0% วันนี้"} tone="gray" icon={UserCheck} />
      </section>
      <div className="dashboard-grid dashboard-content-grid">
        <TodayAttendance sessions={data.sessions} />
        <WeeklyAttendanceChart data={data.chart} />
      </div>
    </div>
  );
}
