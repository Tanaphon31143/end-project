import Link from "next/link";
import { ScanFace } from "lucide-react";
import { redirect } from "next/navigation";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherDashboard } from "@/lib/teacher-data";

export default async function ScanSessionsPage() {
  const auth = await getTeacherSession();
  if (!auth) redirect("/");
  const data = await getTeacherDashboard(auth.id);
  const available = data.sessions.filter((session) => session.status !== "closed");
  return <>
    <div className="page-head"><div><h2>เช็คชื่อด้วยใบหน้า</h2><p>เลือกรอบเช็คชื่อของวันนี้เพื่อเปิดกล้อง</p></div></div>
    <section className="panel"><div className="panel-head"><h3>รอบที่พร้อมใช้งาน</h3><Link href="/teacher/courses">สร้างรอบเช็คชื่อ</Link></div>{available.length ? <div className="session-list">{available.map((session) => <Link className="session-item" href={`/teacher/scan/${session.id}`} key={session.id}><div className="session-time">{session.time}</div><div><b>{session.name}</b><span>{session.code} · เข้าเรียน {session.count} คน</span></div><span className={`status ${session.status}`}>{session.label}</span></Link>)}</div> : <div className="empty"><ScanFace size={42} /><h3>ไม่มีรอบเช็คชื่อที่เปิดอยู่</h3><p>สร้างรอบใหม่จากหน้ารายวิชาของฉัน</p></div>}</section>
  </>;
}
