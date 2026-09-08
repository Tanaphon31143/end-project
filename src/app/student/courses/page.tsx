import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Calendar, Clock, DoorOpen, Info } from "lucide-react";
import { PageTitle } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { getStudentCourses } from "@/lib/student-data";

export const dynamic = "force-dynamic";

const weekdays = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์"];

export default async function CoursesPage() {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const courses = await getStudentCourses(session.id);

  return (
    <>
      <PageTitle
        eyebrow="ข้อมูลจากภาคเรียนปัจจุบัน"
        title="รายวิชาของฉัน"
        description="รายวิชาและตารางเรียนประจำสัปดาห์ของห้องเรียนคุณ"
      />

      <section className="course-grid">
        {courses.map((c, i) => (
          <article className="card course-card" key={c.id}>
            <div className={`course-icon c${i % 5}`}>
              <BookOpen size={24} />
            </div>
            <div className="course-main">
              <div className="course-header-row">
                <span className="course-code-badge">{c.code}</span>
                <span className="course-credits-badge">{c.credits} หน่วยกิต</span>
              </div>
              <h2>{c.name}</h2>
              <p className="course-teacher-name">ครูผู้สอน: {c.teacher}</p>

              <div className="course-meta-tags">
                <small>
                  <Clock size={14} /> วันและเวลา{" "}
                  <b>
                    {c.days.length
                      ? `${c.days.join(", ")} ${c.startTime}–${c.endTime}`
                      : "ยังไม่กำหนด"}
                  </b>
                </small>
                <small>
                  <DoorOpen size={14} /> ห้องเรียน <b>{c.room}</b>
                </small>
              </div>

              {c.description && (
                <p className="course-description">{c.description}</p>
              )}

              <div className="course-card-footer">
                <Link
                  href={`/student/courses/${c.id}`}
                  className="button secondary course-detail-btn"
                >
                  <Info size={16} /> ดูรายละเอียด
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      {!courses.length && (
        <section className="card empty-note">
          ยังไม่มีรายวิชาที่เปิดใช้งานสำหรับห้องเรียนของคุณ
        </section>
      )}

      <section className="card weekly">
        <div className="section-head">
          <div>
            <h2>ตารางเรียนประจำสัปดาห์</h2>
            <p>จัดกลุ่มตามวันที่กำหนดในรายวิชา</p>
          </div>
        </div>
        <div className="weekly-grid">
          {weekdays.map((day) => (
            <div key={day}>
              <strong>{day}</strong>
              {courses
                .filter((c) => c.days.includes(day))
                .map((c) => (
                  <article key={c.id}>
                    <span>
                      {c.startTime}–{c.endTime}
                    </span>
                    <b>{c.name}</b>
                    <small>{c.room}</small>
                  </article>
                ))}
              {!courses.some((c) => c.days.includes(day)) && (
                <p className="weekly-empty">ไม่มีรายวิชา</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
