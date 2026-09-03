import { BookOpen, CircleCheck, UserRound, Users } from "lucide-react";
import { AttendanceChart } from "@/components/admin/AttendanceChart";
import { QuickMenu } from "@/components/admin/QuickMenu";
import { RecentAttendanceTable } from "@/components/admin/RecentAttendanceTable";
import { StatCard } from "@/components/admin/StatCard";
import { SystemStatus } from "@/components/admin/SystemStatus";
import { getAdminCounts } from "@/lib/admin-data";

export const dynamic = "force-dynamic";
export default async function AdminDashboardPage() {
  const counts = await getAdminCounts();
  return <main className="admin-content">
    <section className="stats-row" aria-label="ข้อมูลสรุป">
      <StatCard icon={Users} title="จำนวนนักเรียน" value={counts.students.toLocaleString()} unit="คน" note="ข้อมูลจากฐานข้อมูล" tone="blue" />
      <StatCard icon={UserRound} title="จำนวนครู" value={counts.teachers.toLocaleString()} unit="คน" note="ข้อมูลจากฐานข้อมูล" tone="green" />
      <StatCard icon={BookOpen} title="รายวิชาทั้งหมด" value={counts.subjects.toLocaleString()} unit="วิชา" note="ภาคเรียนที่ 1/2569" tone="purple" />
      <StatCard icon={CircleCheck} title="เช็คชื่อวันนี้" value={counts.attendanceToday.toLocaleString()} unit="คน" note="ข้อมูลการเช็คชื่อวันนี้" tone="orange" />
    </section>
    <section className="dashboard-upper"><AttendanceChart/><QuickMenu/></section>
    <section className="dashboard-lower"><RecentAttendanceTable/><SystemStatus/></section>
  </main>;
}
