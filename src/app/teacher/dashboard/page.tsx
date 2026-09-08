import Link from "next/link";
import {
  BookOpen,
  Clock3,
  UserCheck,
  UserMinus,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { AttendanceChart } from "@/components/teacher/AttendanceChart";
import { RefreshButton } from "@/components/teacher/RefreshButton";
import { StatCard } from "@/components/teacher/StatCard";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherDashboard } from "@/lib/teacher-data";

export default async function Dashboard() {
  const session = await getTeacherSession();
  if (!session) return null;
  const data = await getTeacherDashboard(session.id);
  const date = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "full",
    timeZone: "Asia/Bangkok",
  }).format(new Date());
  return (
    <>
      <div className="page-head">
        <div>
          <h2>สวัสดีครับ คุณครู{data.teacherName} 👋</h2>
          <p>{date}</p>
        </div>
        <RefreshButton />
      </div>
      <section className="stats-grid">
        <StatCard
          label="รายวิชาที่สอน"
          value={String(data.courses)}
          detail="รายวิชาที่เปิดใช้งาน"
          tone="blue"
          icon={BookOpen}
        />
        <StatCard
          label="นักเรียนทั้งหมด"
          value={String(data.students)}
          detail="นับแบบไม่ซ้ำ"
          tone="blue"
          icon={UsersRound}
        />
        <StatCard
          label="เข้าเรียน"
          value={String(data.counts.PRESENT)}
          detail={data.details.present}
          tone="green"
          icon={UserRoundCheck}
        />
        <StatCard
          label="มาสาย"
          value={String(data.counts.LATE)}
          detail={data.details.late}
          tone="yellow"
          icon={Clock3}
        />
        <StatCard
          label="ขาดเรียน"
          value={String(data.counts.ABSENT)}
          detail={data.details.absent}
          tone="red"
          icon={UserMinus}
        />
        <StatCard
          label="ลา"
          value={String(data.counts.LEAVE)}
          detail={data.details.leave}
          tone="gray"
          icon={UserCheck}
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>รอบเช็คชื่อวันนี้</h3>
            <Link href="/teacher/history">ดูทั้งหมด</Link>
          </div>
          {data.sessions.length ? (
            <div className="session-list">
              {data.sessions.map((item) => (
                <Link
                  href={`/teacher/scan/${item.id}`}
                  className="session-item"
                  key={item.id}
                >
                  <div className="session-time">{item.time}</div>
                  <div>
                    <b>{item.name}</b>
                    <span>
                      {item.code} · เข้าเรียน {item.count} คน
                    </span>
                  </div>
                  <span className={`status ${item.status}`}>{item.label}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>วันนี้ยังไม่มีรอบเช็คชื่อ</h3>
              <p>สร้างรอบใหม่ได้จากหน้ารายวิชาของฉัน</p>
            </div>
          )}
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>สถิติการเข้าเรียนรายสัปดาห์</h3>
              <span className="muted">ย้อนหลัง 6 วันทำการ (ครั้ง)</span>
            </div>
          </div>
          <AttendanceChart data={data.chart} />
        </article>
      </section>
    </>
  );
}
