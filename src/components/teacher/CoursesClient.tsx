"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, X } from "lucide-react";
import { CourseCard, type Course } from "@/components/teacher/CourseCard";

type CourseSchedule = {
  id: number;
  dayOfWeek: number;
  day: string;
  periodName: string;
  startTime: string;
  endTime: string;
};
type TeacherCourse = Omit<Course, "color"> & {
  classroomId: number | null;
  startTime: string;
  endTime: string;
  schedules: CourseSchedule[];
};
const colors = ["#255bd4", "#11906a", "#754bb8", "#d07428", "#227c9d"];
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const nextScheduleDate = (dayOfWeek?: number) => {
  if (!dayOfWeek) return today();
  const date = new Date(`${today()}T12:00:00+07:00`);
  const current = date.getDay() || 7;
  date.setDate(date.getDate() + ((dayOfWeek - current + 7) % 7));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export function CoursesClient({
  initialCourses,
}: {
  initialCourses: TeacherCourse[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(initialCourses[0]?.id ?? 0);
  const [selectedSchedule, setSelectedSchedule] = useState(
    initialCourses[0]?.schedules[0]?.id ?? 0,
  );
  const [sessionDate, setSessionDate] = useState(
    nextScheduleDate(initialCourses[0]?.schedules[0]?.dayOfWeek),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const current = useMemo(
    () => initialCourses.find((course) => course.id === selected),
    [initialCourses, selected],
  );
  const currentSchedule = useMemo(
    () =>
      current?.schedules.find((schedule) => schedule.id === selectedSchedule) ??
      current?.schedules[0],
    [current, selectedSchedule],
  );
  function open(id: number) {
    const course = initialCourses.find((item) => item.id === id),
      schedule = course?.schedules[0];
    setSelected(id);
    setSelectedSchedule(schedule?.id ?? 0);
    setSessionDate(nextScheduleDate(schedule?.dayOfWeek));
    setMessage("");
    setModal(true);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentSchedule) {
      setMessage(
        "รายวิชานี้ยังไม่มีตารางเรียน กรุณาให้ผู้ดูแลระบบเพิ่มคาบเรียนก่อน",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/teacher/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selected,
          scheduleId: currentSchedule.id,
          sessionDate: values.get("sessionDate"),
          lateMinutes: Number(values.get("lateMinutes")),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "สร้างรอบเช็คชื่อไม่สำเร็จ");
      router.push(`/teacher/scan/${data.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }
  if (!initialCourses.length)
    return (
      <div className="panel empty">
        <h3>ยังไม่มีรายวิชาที่รับผิดชอบ</h3>
        <p>ติดต่อผู้ดูแลระบบเพื่อกำหนดรายวิชาและห้องเรียน</p>
      </div>
    );
  return (
    <>
      <div className="page-head">
        <div>
          <h2>รายวิชาของฉัน</h2>
          <p>ข้อมูลรายวิชา ห้องเรียน และนักเรียนจากฐานข้อมูล</p>
        </div>
        <button
          className="button primary"
          onClick={() => open(initialCourses[0].id)}
        >
          <Plus size={17} />
          สร้างรอบเช็คชื่อ
        </button>
      </div>
      <section className="course-grid">
        {initialCourses.map((course, index) => (
          <CourseCard
            key={course.id}
            course={{ ...course, color: colors[index % colors.length] }}
            onCreate={() => open(course.id)}
          />
        ))}
      </section>
      {modal && current && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submit}>
            <div className="modal-head">
              <div>
                <h3>สร้างรอบเช็คชื่อ</h3>
                <p className="muted">
                  เลือกรอบจากตารางเรียนที่ผู้ดูแลระบบกำหนด
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModal(false)}
                aria-label="ปิด"
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <div className="field full">
                <label>รายวิชา</label>
                <select
                  value={selected}
                  onChange={(event) => {
                    const id = Number(event.target.value);
                    const course = initialCourses.find(
                        (item) => item.id === id,
                      ),
                      schedule = course?.schedules[0];
                    setSelected(id);
                    setSelectedSchedule(schedule?.id ?? 0);
                    setSessionDate(nextScheduleDate(schedule?.dayOfWeek));
                  }}
                >
                  {initialCourses.map((course) => (
                    <option value={course.id} key={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>วันที่</label>
                <input
                  name="sessionDate"
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>คาบเรียน</label>
                <select
                  value={currentSchedule?.id ?? ""}
                  onChange={(event) => {
                    const schedule = current.schedules.find(
                      (item) => item.id === Number(event.target.value),
                    );
                    setSelectedSchedule(schedule?.id ?? 0);
                    setSessionDate(nextScheduleDate(schedule?.dayOfWeek));
                  }}
                  required
                >
                  <option value="" disabled>
                    {current.schedules.length
                      ? "เลือกคาบเรียน"
                      : "ยังไม่มีตารางเรียน"}
                  </option>
                  {current.schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.day} · {schedule.periodName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>เวลาเริ่ม</label>
                <input value={currentSchedule?.startTime ?? "--:--"} readOnly />
              </div>
              <div className="field">
                <label>เวลาสิ้นสุด</label>
                <input value={currentSchedule?.endTime ?? "--:--"} readOnly />
              </div>
              <div className="field full">
                <label>ถือว่ามาสายหลังเริ่มเรียน (นาที)</label>
                <input
                  name="lateMinutes"
                  type="number"
                  defaultValue="15"
                  min="0"
                  max="120"
                  required
                />
              </div>
            </div>
            {message && <p className="form-message error">{message}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setModal(false)}
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                className="button primary"
                disabled={saving || !currentSchedule}
              >
                {saving && <LoaderCircle className="spin" size={16} />}{" "}
                {saving ? "กำลังสร้าง" : "สร้างรอบเช็คชื่อ"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
