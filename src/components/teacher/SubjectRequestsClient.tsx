"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import type {
  StudySchedule,
  SubjectRequest,
  SubjectRequestInput,
  RequestStatus,
} from "@/lib/subject-requests";
import { showActionSuccess } from "@/lib/sweet-alert";

const days = [
  "",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];
const labels: Record<RequestStatus, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CHANGES_REQUESTED: "ขอแก้ไขข้อมูล",
};
const blankSchedule = (): StudySchedule => ({
  dayOfWeek: 1,
  periodName: "",
  startTime: "08:30",
  endTime: "09:30",
});
const blank = (academicYear: string): SubjectRequestInput => ({
  subjectName: "",
  subjectCode: "",
  semester: 1,
  academicYear,
  description: "",
  classroomId: 0,
  schedules: [blankSchedule()],
});
export function SubjectRequestsClient({
  initialRequests,
  classrooms,
  academicYear,
}: {
  initialRequests: SubjectRequest[];
  classrooms: { id: number; name: string; level: string }[];
  academicYear: string;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [form, setForm] = useState<SubjectRequestInput>(() =>
    blank(academicYear),
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function startEdit(item: SubjectRequest) {
    setForm({
      subjectName: item.subjectName,
      subjectCode: item.subjectCode,
      semester: item.semester,
      academicYear: item.academicYear,
      description: item.description || "",
      classroomId: item.classroomId,
      schedules: item.schedules.map((s) => ({ ...s })),
    });
    setEditing(item.id);
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function updateSchedule(index: number, change: Partial<StudySchedule>) {
    setForm((current) => ({
      ...current,
      schedules: current.schedules.map((item, i) =>
        i === index ? { ...item, ...change } : item,
      ),
    }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/teacher/subject-requests", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, requestId: editing }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message || "ส่งคำขอไม่สำเร็จ");
      const refreshed = await fetch("/api/teacher/subject-requests", {
        cache: "no-store",
      });
      if (!refreshed.ok)
        throw new Error(
          "ส่งคำขอแล้ว แต่โหลดสถานะล่าสุดไม่สำเร็จ กรุณารีเฟรชหน้า",
        );
      setRequests(
        ((await refreshed.json()) as { requests: SubjectRequest[] }).requests,
      );
      setMessage(result.message || "ส่งคำขอแล้ว");
      setShowForm(false);
      setEditing(null);
      setForm(blank(academicYear));
      void showActionSuccess(
        result.message || (editing ? "ส่งคำขอที่แก้ไขแล้ว" : "ส่งคำขอแล้ว"),
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "เกิดข้อผิดพลาด กรุณาลองใหม่",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="subject-request-page">
      <div className="subject-request-heading">
        <div>
          <Link href="/teacher/courses" className="subject-request-back">
            <ArrowLeft size={16} /> รายวิชาของฉัน
          </Link>
          <h2>คำขอเปิดรายวิชา</h2>
          <p>
            เลือกห้องเรียนและกำหนดเวลาเรียนด้วยตนเอง เมื่อผู้ดูแลระบบอนุมัติ
            รายวิชาจะพร้อมใช้สำหรับเช็คชื่อ
          </p>
        </div>
        <button
          className="button primary"
          type="button"
          onClick={() => {
            setEditing(null);
            setForm(blank(academicYear));
            setShowForm((current) => !current);
            setError("");
          }}
        >
          <Plus size={17} />{" "}
          {showForm && !editing ? "ปิดแบบฟอร์ม" : "ขอเปิดรายวิชา"}
        </button>
      </div>
      {message && (
        <p className="subject-request-notice success" role="status">
          <CheckCircle2 size={17} />
          {message}
        </p>
      )}
      {showForm && (
        <form className="subject-request-form" onSubmit={submit}>
          <div className="subject-request-section-head">
            <div>
              <h3>{editing ? "แก้ไขและส่งคำขออีกครั้ง" : "ข้อมูลรายวิชา"}</h3>
              <p>ข้อมูลที่ส่งจะรอการตรวจสอบก่อนเปิดใช้งาน</p>
            </div>
          </div>
          <div className="subject-request-fields">
            <label>
              ชื่อรายวิชา <span>*</span>
              <input
                required
                maxLength={200}
                value={form.subjectName}
                onChange={(e) =>
                  setForm({ ...form, subjectName: e.target.value })
                }
                placeholder="เช่น คณิตศาสตร์พื้นฐาน"
              />
            </label>
            <label>
              รหัสวิชา <span>*</span>
              <input
                required
                maxLength={30}
                value={form.subjectCode}
                onChange={(e) =>
                  setForm({ ...form, subjectCode: e.target.value })
                }
                placeholder="เช่น ค22101"
              />
            </label>
            <label className="wide">
              คำอธิบาย <span className="optional">(ไม่บังคับ)</span>
              <textarea
                rows={3}
                maxLength={255}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="รายละเอียดรายวิชาเพิ่มเติม"
              />
            </label>
          </div>
          <div className="subject-request-schedule-head">
            <div>
              <h4>
                <CalendarDays size={18} /> ข้อมูลการเรียน
              </h4>
              <p>เลือกภาคเรียน ปีการศึกษา ห้องเรียน และกำหนดวันเวลาเรียน</p>
            </div>
          </div>
          <div className="subject-request-fields subject-request-study-fields">
            <label>
              ภาคเรียน <span>*</span>
              <select
                value={form.semester}
                onChange={(e) =>
                  setForm({ ...form, semester: Number(e.target.value) })
                }
              >
                <option value={1}>ภาคเรียนที่ 1</option>
                <option value={2}>ภาคเรียนที่ 2</option>
                <option value={3}>ภาคเรียนที่ 3</option>
              </select>
            </label>
            <label>
              ปีการศึกษา <span>*</span>
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={form.academicYear}
                onChange={(e) =>
                  setForm({ ...form, academicYear: e.target.value })
                }
              />
            </label>
            <label>
              ห้องเรียน <span>*</span>
              <select
                required
                value={form.classroomId || ""}
                onChange={(e) =>
                  setForm({ ...form, classroomId: Number(e.target.value) })
                }
              >
                <option value="">เลือกห้องเรียน</option>
                {classrooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} · {room.level}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="subject-request-schedule-head subject-request-period-head">
            <div>
              <h4>วันและเวลาเรียน</h4>
              <p>ระบุวันและเวลาอย่างน้อย 1 คาบ</p>
            </div>
            <button
              className="button"
              type="button"
              disabled={form.schedules.length >= 12}
              onClick={() =>
                setForm({
                  ...form,
                  schedules: [...form.schedules, blankSchedule()],
                })
              }
            >
              <Plus size={16} /> เพิ่มคาบเรียน
            </button>
          </div>
          <div className="subject-request-schedules">
            {form.schedules.map((schedule, index) => (
              <div className="subject-request-schedule" key={index}>
                <label>
                  วัน
                  <select
                    value={schedule.dayOfWeek}
                    onChange={(e) =>
                      updateSchedule(index, {
                        dayOfWeek: Number(e.target.value),
                      })
                    }
                  >
                    {days.slice(1).map((day, dayIndex) => (
                      <option key={day} value={dayIndex + 1}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  ชื่อคาบ{" "}
                  <input
                    maxLength={50}
                    value={schedule.periodName}
                    onChange={(e) =>
                      updateSchedule(index, { periodName: e.target.value })
                    }
                    placeholder="เช่น คาบที่ 1"
                  />
                </label>
                <label>
                  เริ่ม
                  <input
                    required
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) =>
                      updateSchedule(index, { startTime: e.target.value })
                    }
                  />
                </label>
                <label>
                  สิ้นสุด
                  <input
                    required
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) =>
                      updateSchedule(index, { endTime: e.target.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  aria-label={`ลบคาบเรียนที่ ${index + 1}`}
                  disabled={form.schedules.length === 1}
                  onClick={() =>
                    setForm({
                      ...form,
                      schedules: form.schedules.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          {error && (
            <p className="subject-request-notice error" role="alert">
              {error}
            </p>
          )}
          <div className="subject-request-actions">
            <button
              type="button"
              className="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
              ยกเลิก
            </button>
            <button
              className="button primary"
              disabled={busy || !classrooms.length}
              type="submit"
            >
              <Send size={16} />
              {busy
                ? "กำลังส่งคำขอ…"
                : editing
                  ? "ส่งคำขออีกครั้ง"
                  : "ส่งคำขออนุมัติ"}
            </button>
          </div>
        </form>
      )}
      <section className="subject-request-history">
        <div className="subject-request-section-head">
          <div>
            <h3>สถานะคำขอ</h3>
            <p>ติดตามผลและดูความเห็นจากผู้ดูแลระบบ</p>
          </div>
          <span>{requests.length} รายการ</span>
        </div>
        {requests.length ? (
          <div className="subject-request-list">
            {requests.map((item) => (
              <article className="subject-request-item" key={item.id}>
                <div className="subject-request-item-main">
                  <div>
                    <h4>{item.subjectName}</h4>
                    <p>
                      {item.subjectCode} · {item.classroomName} · ภาคเรียนที่{" "}
                      {item.semester}/{item.academicYear}
                    </p>
                  </div>
                  <span
                    className={`subject-request-status ${item.status.toLowerCase()}`}
                  >
                    {labels[item.status]}
                  </span>
                </div>
                <p className="subject-request-item-schedule">
                  <Clock3 size={15} />{" "}
                  {item.schedules
                    .map(
                      (s) => `${days[s.dayOfWeek]} ${s.startTime}–${s.endTime}`,
                    )
                    .join(" · ") || "ไม่มีข้อมูลตารางเรียน"}
                </p>
                {item.adminRemark && (
                  <p className="subject-request-remark">
                    <strong>ความเห็นผู้ดูแลระบบ:</strong> {item.adminRemark}
                  </p>
                )}
                <div className="subject-request-item-foot">
                  <span>อัปเดต {item.updatedAt}</span>
                  {["REJECTED", "CHANGES_REQUESTED"].includes(item.status) && (
                    <button
                      className="button"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      แก้ไขและส่งอีกครั้ง
                    </button>
                  )}
                  {item.status === "APPROVED" && (
                    <Link className="button" href="/teacher/courses">
                      ดูรายวิชา
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="subject-request-empty">
            <CalendarDays size={24} />
            <h4>ยังไม่มีคำขอรายวิชา</h4>
            <p>เริ่มต้นด้วยการกรอกข้อมูลวิชา ห้องเรียน และตารางเรียน</p>
          </div>
        )}
      </section>
    </div>
  );
}
