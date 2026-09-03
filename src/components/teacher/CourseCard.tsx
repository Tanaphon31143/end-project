import Link from "next/link";
import { CalendarDays, Clock3, MapPin, Users } from "lucide-react";
export type Course = {
  id: number;
  code: string;
  name: string;
  room: string;
  day: string;
  time: string;
  students: number;
  color: string;
};
export function CourseCard({
  course,
  onCreate,
}: {
  course: Course;
  onCreate: () => void;
}) {
  return (
    <article className="course-card">
      <div className="course-band" style={{ background: course.color }}>
        <span>{course.code}</span>
        <b>{course.name}</b>
      </div>
      <div className="course-body">
        <p>
          <MapPin />
          ห้อง {course.room}
        </p>
        <p>
          <CalendarDays />
          {course.day}
        </p>
        <p>
          <Clock3 />
          {course.time} น.
        </p>
        <p>
          <Users />
          {course.students} คน
        </p>
        <div className="course-actions">
          <Link
            className="button secondary"
            href={`/teacher/history?course=${course.id}`}
          >
            ดูรายละเอียด
          </Link>
          <button className="button primary" onClick={onCreate}>
            สร้างรอบเช็คชื่อ
          </button>
        </div>
      </div>
    </article>
  );
}
