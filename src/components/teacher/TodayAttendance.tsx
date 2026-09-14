import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3, UsersRound } from "lucide-react";
import { EmptyState } from "./EmptyState";

export type DashboardSession = {
  id: string;
  time?: string | null;
  code?: string | null;
  name?: string | null;
  subjectName?: string | null;
  room?: string | null;
  count?: string | null;
  status?: string | null;
};

function AttendanceSessionCard({ item }: { item: DashboardSession }) {
  const state = item.status === "closed" ? "closed" : item.status === "active" ? "active" : "upcoming";
  const label = state === "closed" ? "เสร็จสิ้น" : state === "active" ? "กำลังเช็คชื่อ" : "ยังไม่เริ่ม";
  return (
    <article className="dashboard-session-card">
      <div className="dashboard-session-time"><Clock3 size={16} aria-hidden="true" /><span>{item.time || "-"}</span></div>
      <div className="dashboard-session-info">
        <h4>{item.subjectName || item.name || "ไม่มีข้อมูล"}</h4>
        <div className="dashboard-session-meta">
          <span>{item.code || "-"}</span>
          <span className="dashboard-meta-dot" aria-hidden="true" />
          <span>{item.room || "ไม่ระบุห้อง"}</span>
        </div>
      </div>
      <div className="dashboard-session-count"><UsersRound size={15} aria-hidden="true" /> เข้าเรียน {item.count || "0/0"} คน</div>
      <span className={`dashboard-session-status ${state}`}>{label}</span>
      <Link className="dashboard-session-link" href={`/teacher/scan/${item.id}`}>ดูรายละเอียด <ArrowUpRight size={15} aria-hidden="true" /></Link>
    </article>
  );
}

export function TodayAttendance({ sessions }: { sessions?: DashboardSession[] | null }) {
  return (
    <section className="panel dashboard-panel" aria-labelledby="today-heading">
      <div className="dashboard-panel-head">
        <div><p className="dashboard-eyebrow">ตารางวันนี้</p><h3 id="today-heading">รอบเช็คชื่อวันนี้</h3></div>
        <Link href="/teacher/history" className="dashboard-view-all">ดูทั้งหมด <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </div>
      {sessions?.length ? (
        <div className="dashboard-session-list">{sessions.map((item) => <AttendanceSessionCard key={item.id} item={item} />)}</div>
      ) : <EmptyState icon={CalendarDays} title="วันนี้ยังไม่มีรอบเช็คชื่อ" description="สร้างรอบใหม่ได้จากหน้ารายวิชาของฉัน" />}
    </section>
  );
}
