import Link from "next/link";
import {
  BookOpen,
  Clock3,
  RefreshCw,
  UserCheck,
  UserMinus,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { StatCard } from "@/components/teacher/StatCard";
import { AttendanceChart } from "@/components/teacher/AttendanceChart";
const sessions = [
  {
    time: "08:30",
    code: "ว30201",
    name: "วิทยาการคำนวณ ม.4/1",
    count: "31/36",
    status: "closed",
    label: "เสร็จสิ้น",
  },
  {
    time: "10:20",
    code: "ว32102",
    name: "การเขียนโปรแกรม ม.5/2",
    count: "28/32",
    status: "active",
    label: "กำลังดำเนินการ",
  },
  {
    time: "13:00",
    code: "ว33101",
    name: "โครงงานคอมพิวเตอร์ ม.6/1",
    count: "0/29",
    status: "upcoming",
    label: "ยังไม่เริ่ม",
  },
];
export default function Dashboard() {
  const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "full" }).format(
    new Date(),
  );
  return (
    <>
      <div className="page-head">
        <div>
          <h2>สวัสดีครับ คุณครูสมชาย 👋</h2>
          <p>{date}</p>
        </div>
        <button className="button ghost">
          <RefreshCw size={16} />
          รีเฟรชข้อมูล
        </button>
      </div>
      <section className="stats-grid">
        <StatCard
          label="รายวิชาที่สอน"
          value="4"
          detail="ภาคเรียนนี้"
          tone="blue"
          icon={BookOpen}
        />
        <StatCard
          label="นักเรียนทั้งหมด"
          value="128"
          detail="4 ห้องเรียน"
          tone="blue"
          icon={UsersRound}
        />
        <StatCard
          label="เข้าเรียน"
          value="86"
          detail="84.3% วันนี้"
          tone="green"
          icon={UserRoundCheck}
        />
        <StatCard
          label="มาสาย"
          value="8"
          detail="7.8% วันนี้"
          tone="yellow"
          icon={Clock3}
        />
        <StatCard
          label="ขาดเรียน"
          value="6"
          detail="5.9% วันนี้"
          tone="red"
          icon={UserMinus}
        />
        <StatCard
          label="ลา"
          value="2"
          detail="2.0% วันนี้"
          tone="gray"
          icon={UserCheck}
        />
      </section>
      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-head">
            <h3>การเช็คชื่อล่าสุด</h3>
            <Link href="/teacher/history">ดูทั้งหมด</Link>
          </div>
          <div className="session-list">
            {sessions.map((s) => (
              <div className="session-item" key={s.time}>
                <div className="session-time">{s.time}</div>
                <div>
                  <b>{s.name}</b>
                  <span>
                    {s.code} · เข้าเรียน {s.count} คน
                  </span>
                </div>
                <span className={`status ${s.status}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <h3>สถิติการเข้าเรียนรายสัปดาห์</h3>
              <span className="muted">ย้อนหลัง 6 วันทำการ (%)</span>
            </div>
          </div>
          <AttendanceChart />
        </article>
      </section>
    </>
  );
}
