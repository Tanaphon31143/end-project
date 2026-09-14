import Link from "next/link";
import { ArrowRight, Clock3, ScanFace } from "lucide-react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/teacher/EmptyState";
import { getTeacherSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import "./scan.css";

export const dynamic = "force-dynamic";

export default async function ScanSessionsPage() {
  const auth = await getTeacherSession();
  if (!auth) redirect("/");

  // Dashboard sessions only cover today; the menu must find all active rounds
  // belonging to the teacher, including rounds created for other dates.
  const sessions = await prisma.checkInSession.findMany({
    where: { status: "ACTIVE", subject: { teacherId: auth.id } },
    select: {
      id: true,
      sessionDate: true,
      startTime: true,
      endTime: true,
      subject: { select: { subjectCode: true, subjectName: true, classroom: { select: { name: true } } } },
    },
    orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
  });
  const recentlyClosed = sessions.length ? [] : await prisma.checkInSession.findMany({
    where: { status: "CLOSED", subject: { teacherId: auth.id } },
    select: {
      id: true,
      sessionDate: true,
      subject: { select: { subjectCode: true, subjectName: true, classroom: { select: { name: true } } } },
    },
    orderBy: [{ sessionDate: "desc" }, { id: "desc" }],
    take: 5,
  });

  if (sessions.length === 1) redirect("/teacher/scan/" + sessions[0].id);

  const dateFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const time = (value: Date) => String(value.getUTCHours()).padStart(2, "0") + ":" + String(value.getUTCMinutes()).padStart(2, "0");

  return (
    <div className="teacher-scan-index">
      <header className="scan-index-heading">
        <p>การสแกนใบหน้า</p>
        <h2>เช็คชื่อด้วยใบหน้า</h2>
        <span>เลือกรอบเช็คชื่อที่เปิดอยู่เพื่อเข้าหน้ากล้อง</span>
      </header>

      <section className="panel scan-index-panel" aria-labelledby="scan-active-heading">
        <div className="scan-index-panel-head">
          <div>
            <p>รอบเช็คชื่อ</p>
            <h3 id="scan-active-heading">รอบที่พร้อมใช้งาน <span className="scan-count">{sessions.length}</span></h3>
          </div>
          <Link className="button primary scan-create-button" href="/teacher/courses">สร้างรอบเช็คชื่อ</Link>
        </div>
        {sessions.length ? (
          <div className="scan-session-list">
            {sessions.map((session) => (
              <Link className="scan-session-row active" href={`/teacher/scan/${session.id}`} key={String(session.id)}>
                <div className="scan-session-time"><Clock3 size={17} aria-hidden="true" />{time(session.startTime)}</div>
                <div className="scan-session-copy">
                  <strong>{session.subject.subjectName}</strong>
                  <span>{session.subject.subjectCode} · {session.subject.classroom?.name ?? "ยังไม่ระบุห้อง"}</span>
                  <small>{dateFormatter.format(session.sessionDate)} · {time(session.startTime)}–{time(session.endTime)} น.</small>
                </div>
                <span className="scan-session-status active">เปิดอยู่</span>
                <ArrowRight className="scan-session-arrow" size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={ScanFace} title="ไม่มีรอบเช็คชื่อที่เปิดอยู่" description="รอบที่ปิดแล้วจะไม่สามารถสแกนเพิ่มได้ สร้างรอบใหม่จากหน้ารายวิชาของฉัน" />
        )}
      </section>

      {recentlyClosed.length > 0 && (
        <section className="panel scan-index-panel scan-recent-panel" aria-labelledby="scan-recent-heading">
          <div className="scan-index-panel-head">
            <div><p>ประวัติล่าสุด</p><h3 id="scan-recent-heading">รอบที่ปิดล่าสุด</h3></div>
            <Link className="scan-history-link" href="/teacher/history">ดูประวัติทั้งหมด <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <div className="scan-session-list">
            {recentlyClosed.map((session) => (
              <Link className="scan-session-row closed" href={`/teacher/history/${session.id}`} key={String(session.id)}>
                <div className="scan-session-copy">
                  <strong>{session.subject.subjectName}</strong>
                  <span>{session.subject.subjectCode} · {session.subject.classroom?.name ?? "ยังไม่ระบุห้อง"}</span>
                  <small>{dateFormatter.format(session.sessionDate)} · ดูผลการเช็คชื่อ</small>
                </div>
                <span className="scan-session-status closed">ปิดรอบแล้ว</span>
                <ArrowRight className="scan-session-arrow" size={18} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
