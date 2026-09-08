import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherSessionDetail } from "@/lib/teacher-data";
import { AttendanceDetailClient } from "@/components/teacher/AttendanceDetailClient";

export default async function HistoryDetail({ params }: { params: Promise<{ sessionId: string }> }) {
  const auth = await getTeacherSession();
  if (!auth) redirect("/");
  const { sessionId } = await params;
  const session = await getTeacherSessionDetail(auth.id, sessionId);
  if (!session) notFound();
  return <>
    <div className="page-head"><div><Link className="back-link" href="/teacher/history"><ArrowLeft size={16} />กลับไปหน้าประวัติ</Link><h2>{session.subject}</h2><p>{session.date} · ห้อง {session.room} · {session.time} น.</p></div><span className={`status ${session.status === "CLOSED" ? "closed" : "active"}`}>{session.status === "CLOSED" ? "ปิดรอบแล้ว" : "กำลังดำเนินการ"}</span></div>
    <section className="panel"><div className="panel-head"><div><h3>รายชื่อนักเรียน</h3><span className="muted">ทั้งหมด {session.students.length} คน</span></div></div>
      <AttendanceDetailClient sessionId={session.id} students={session.students} />
    </section>
  </>;
}
