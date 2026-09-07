import { ArrowUpRight, BookOpen } from "lucide-react";
import { PageTitle } from "@/components/student/UI";
import { courses } from "@/data/student";
export default function Courses() {
  return (
    <>
      <PageTitle
        eyebrow="ภาคเรียนที่ 1/2569"
        title="รายวิชาของฉัน"
        description="รายวิชาและตารางเรียนประจำสัปดาห์"
      />
      <section className="course-grid">
        {courses.map((c, i) => (
          <article className="card course-card" key={c.code}>
            <div className={`course-icon c${i}`}>
              <BookOpen size={22} />
            </div>
            <div className="course-main">
              <span>{c.code}</span>
              <h2>{c.name}</h2>
              <p>{c.teacher}</p>
              <div>
                <small>
                  วันและเวลา <b>{c.time}</b>
                </small>
                <small>
                  ห้องเรียน <b>{c.room}</b>
                </small>
                <small>
                  หน่วยกิต <b>{c.credit}</b>
                </small>
              </div>
            </div>
            <button
              className="button secondary"
              aria-label={`ดูรายละเอียด ${c.name}`}
            >
              <ArrowUpRight size={17} />
            </button>
          </article>
        ))}
      </section>
      <section className="card weekly">
        <div className="section-head">
          <div>
            <h2>ตารางเรียนประจำสัปดาห์</h2>
            <p>ตารางเรียนหลักของคุณในภาคเรียนนี้</p>
          </div>
        </div>
        <div className="weekly-grid">
          {["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์"].map((d, i) => (
            <div key={d}>
              <strong>{d}</strong>
              <article>
                <span>{courses[i].time.split(" ")[1]}</span>
                <b>{courses[i].name}</b>
                <small>{courses[i].room}</small>
              </article>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
