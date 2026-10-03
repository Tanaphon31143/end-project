import { BookOpen, CircleCheck, UserRound, Users } from "lucide-react";
import { AttendanceChart } from "@/components/admin/AttendanceChart";
import { AttendanceOverview } from "@/components/admin/AttendanceOverview";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { DashboardCalendar } from "@/components/admin/DashboardCalendar";
import { DashboardHero } from "@/components/admin/DashboardHero";
import { QuickMenu } from "@/components/admin/QuickMenu";
import { RecentAttendanceTable } from "@/components/admin/RecentAttendanceTable";
import { StatCard } from "@/components/admin/StatCard";
import { getDashboardData } from "@/lib/admin-data";
import "./status.css";
import "./dashboard.css";

export const dynamic = "force-dynamic";
export default async function AdminDashboardPage() {
  const { counts, recent, daily, attendanceStatus, activity, settings, calendarDates } = await getDashboardData();
  const term = `ภาคเรียนที่ ${settings.semester}/${settings.academicYear}`;

  return (
    <main className="admin-content admin-dashboard">
      <DashboardHero schoolName={settings.schoolName} />
      <section className="stats-row" aria-label="ข้อมูลสรุป">
        <StatCard icon={Users} title="จำนวนนักเรียนทั้งหมด" value={counts.students.toLocaleString("th-TH")} unit="คน" note="นักเรียนในระบบทั้งหมด" tone="blue" />
        <StatCard icon={UserRound} title="จำนวนครูทั้งหมด" value={counts.teachers.toLocaleString("th-TH")} unit="คน" note="บุคลากรครูในระบบ" tone="green" />
        <StatCard icon={BookOpen} title="รายวิชาทั้งหมด" value={counts.subjects.toLocaleString("th-TH")} unit="วิชา" note={term} tone="purple" />
        <StatCard icon={CircleCheck} title="เช็คชื่อวันนี้" value={counts.attendanceToday.toLocaleString("th-TH")} unit="คน" note="นักเรียนที่มาเรียนและมาสาย" tone="orange" />
      </section>
      <section className="dashboard-core-grid">
        <AttendanceChart data={daily} />
        <AttendanceOverview students={counts.students} status={attendanceStatus} />
        <QuickMenu />
      </section>
      <section className="dashboard-detail-grid">
        <RecentAttendanceTable rows={recent} />
        <ActivityTimeline rows={activity} />
        <DashboardCalendar activeDates={calendarDates} />
      </section>
    </main>
  );
}
