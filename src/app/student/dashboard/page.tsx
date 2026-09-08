import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, CalendarCheck, Clock3, Percent, UserX } from "lucide-react";
import { Badge, PageTitle, StatCard } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/student-data";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const data = await getStudentDashboardData(session.id);
  if (!data) notFound();
  const { student, stats, term } = data;
  return (
    <>
      <PageTitle
        eyebrow="ภาพรวมวันนี้"
        title={`สวัสดี, ${student.name}`}
        description={`${student.className} · รหัสนักเรียน ${student.code}`}
      />
      <section className="student-hero card">
        <div className="hero-profile">
          <span className="student-hero-photo">
            {student.hasProfileImage ? (
              <Image
                src="/api/student/profile-image"
                alt="รูปนักเรียน"
                width={64}
                height={64}
                sizes="64px"
                unoptimized
                priority
              />
            ) : (
              student.name.slice(0, 2)
            )}
          </span>
          <div>
            <small>นักเรียน</small>
            <h2>{student.name}</h2>
            <p>
              ภาคเรียนที่ {term.semester} ปีการศึกษา {term.academicYear}
            </p>
          </div>
        </div>
        <div className="face-ready">
          <span>สถานะข้อมูลใบหน้า</span>
          <b>{student.faceReady ? "ลงทะเบียนแล้ว" : "ยังไม่ลงทะเบียน"}</b>
          <Link href="/student/face">ดูข้อมูล</Link>
        </div>
      </section>
      <div className="grid stats-grid">
        <StatCard
          label="รายวิชาที่เรียน"
          value={stats.subjects}
          detail="ภาคเรียนนี้"
          icon={BookOpen}
        />
        <StatCard
          label="มาเรียน"
          value={stats.present}
          detail={`จาก ${stats.total} คาบ`}
          icon={CalendarCheck}
          tone="green"
        />
        <StatCard
          label="มาสาย"
          value={stats.late}
          detail={`${stats.total ? ((stats.late * 100) / stats.total).toFixed(1) : 0}% ของทั้งหมด`}
          icon={Clock3}
          tone="orange"
        />
        <StatCard
          label="ขาด / ลา"
          value={`${stats.absent} / ${stats.leave}`}
          detail={`รวม ${stats.absent + stats.leave} คาบ`}
          icon={UserX}
          tone="red"
        />
        <StatCard
          label="อัตราเข้าเรียน"
          value={`${stats.rate}%`}
          detail={stats.rate >= 80 ? "อยู่ในเกณฑ์ดี" : "ควรปรับปรุง"}
          icon={Percent}
          tone="purple"
        />
      </div>
      <div className="grid two-col">
        <section className="card">
          <div className="section-head">
            <div>
              <h2>ตารางเรียนวันนี้</h2>
              <p>รายวิชาตามห้องเรียนของคุณ</p>
            </div>
            <Link className="text-link" href="/student/courses">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="schedule-list">
            {data.today.length ? (
              data.today.map((c) => (
                <article key={c.id}>
                  <time>{c.startTime}</time>
                  <i />
                  <div>
                    <strong>{c.name}</strong>
                    <p>
                      {c.teacher} · {c.room}
                    </p>
                  </div>
                  <Badge>{c.endTime}</Badge>
                </article>
              ))
            ) : (
              <p className="empty-note">ไม่มีตารางเรียนวันนี้</p>
            )}
          </div>
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h2>การเช็คชื่อล่าสุด</h2>
              <p>รายการจากฐานข้อมูล</p>
            </div>
            <Link className="text-link" href="/student/attendance/history">
              ดูประวัติ
            </Link>
          </div>
          <div className="recent-list">
            {data.recent.length ? (
              data.recent.map((a) => (
                <article key={a.id}>
                  <div>
                    <strong>{a.subject}</strong>
                    <p>
                      {a.date} · เช็คชื่อ {a.checkIn}
                    </p>
                  </div>
                  <Badge>{a.status}</Badge>
                </article>
              ))
            ) : (
              <p className="empty-note">ยังไม่มีประวัติการเช็คชื่อ</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
