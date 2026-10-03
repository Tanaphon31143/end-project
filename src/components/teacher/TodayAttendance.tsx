import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "./EmptyState";

export type DashboardSession = {
  id: string;
  href?: string | null;
  time?: string | null;
  code?: string | null;
  name?: string | null;
  subjectName?: string | null;
  room?: string | null;
  count?: string | null;
  status?: string | null;
};

const statusLabel = (status?: string | null) =>
  status === "closed"
    ? "เสร็จสิ้น"
    : status === "active"
      ? "กำลังเช็คชื่อ"
      : "ยังไม่ถึงเวลา";

export function TodayAttendance({ sessions }: { sessions?: DashboardSession[] | null }) {
  return (
    <section className="panel dashboard-panel dashboard-schedule" aria-labelledby="today-heading">
      <div className="dashboard-panel-head">
        <h3 id="today-heading">ตารางสอนวันนี้</h3>
        <Link href="/teacher/courses" className="dashboard-view-all">ดูทั้งหมด</Link>
      </div>
      {sessions?.length ? (
        <div className="dashboard-schedule-scroll">
          <table className="dashboard-schedule-table">
            <thead>
              <tr><th>เวลา</th><th>รายวิชา</th><th>ห้องเรียน</th><th>สถานะ</th></tr>
            </thead>
            <tbody>
              {sessions.map((item) => (
                <tr key={item.id}>
                  <td>{item.time || "-"}</td>
                  <td><Link href={item.href || `/teacher/scan/${item.id}`}>{item.subjectName || item.name || "ไม่มีข้อมูล"}</Link><small>{item.code || "-"}</small></td>
                  <td>{item.room || "-"}</td>
                  <td><span className={`dashboard-session-status ${item.status === "closed" ? "closed" : item.status === "active" ? "active" : "upcoming"}`}>{statusLabel(item.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={CalendarDays} title="วันนี้ยังไม่มีตารางสอน" description="ตารางเรียนของวันนี้จะแสดงที่นี่" />
      )}
    </section>
  );
}
