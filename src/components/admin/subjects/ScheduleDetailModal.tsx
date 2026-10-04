"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  FileText,
  Pencil,
  School,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import type { SubjectRecord } from "./types";

const dayNames: Record<string, string> = {
  "1": "จันทร์",
  "2": "อังคาร",
  "3": "พุธ",
  "4": "พฤหัสบดี",
  "5": "ศุกร์",
  "6": "เสาร์",
  "7": "อาทิตย์",
};

const dayColorClasses: Record<string, string> = {
  "1": "day-mon",
  "2": "day-tue",
  "3": "day-wed",
  "4": "day-thu",
  "5": "day-fri",
  "6": "day-sat",
  "7": "day-sun",
};

type Tab = "schedule" | "general" | "students";

type Props = {
  subject: SubjectRecord | null;
  onClose: () => void;
  onEdit: (subject: SubjectRecord) => void;
  onDelete: (subject: SubjectRecord) => void;
  busy: boolean;
};

export function ScheduleDetailModal({ subject, onClose, onEdit, onDelete, busy }: Props) {
  const [tab, setTab] = useState<Tab>("schedule");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  function close() {
    setTab("schedule");
    onClose();
  }

  useEffect(() => {
    if (!subject) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    queueMicrotask(() => closeButtonRef.current?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTab("schedule");
        onClose();
      }
      if (event.key === "Tab") {
        const items = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') || []);
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, subject]);

  if (!subject) return null;

  const schedules = subject.schedules || [];
  const hasExactSchedules = subject.scheduleSource === "SCHEDULE" && schedules.length > 0;
  const weeklyPeriods = hasExactSchedules ? schedules.length : subject.studyDays.length;

  return (
    <div
      className="subject-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <aside
        ref={sheetRef}
        className="subject-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-detail-title"
      >
        <header className="subject-detail-head">
          <h2 id="subject-detail-title">รายละเอียดรายวิชา</h2>
          <button ref={closeButtonRef} type="button" onClick={close} aria-label="ปิดรายละเอียดรายวิชา">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="subject-detail-identity">
          <span className="subject-detail-icon" aria-hidden="true"><BookOpen size={29} /></span>
          <div>
            <b>{subject.subjectCode}</b>
            <h3>{subject.subjectName}</h3>
            <p>ระดับชั้น {subject.className || subject.gradeLevel || "ยังไม่ระบุ"} <i /> ภาคเรียนที่ {subject.semester}/{subject.academicYear}</p>
          </div>
          <span className={`subject-detail-status ${subject.isActive ? "active" : "inactive"}`}>
            {subject.isActive ? "เปิดสอน" : "ปิดสอน"}
          </span>
        </div>

        <nav className="subject-detail-tabs" aria-label="หมวดรายละเอียดรายวิชา" role="tablist">
          <button type="button" role="tab" className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")} aria-selected={tab === "schedule"}>
            <CalendarDays size={17} aria-hidden="true" /> ตารางเรียน
          </button>
          <button type="button" role="tab" className={tab === "general" ? "active" : ""} onClick={() => setTab("general")} aria-selected={tab === "general"}>
            <FileText size={17} aria-hidden="true" /> ข้อมูลทั่วไป
          </button>
          <button type="button" role="tab" className={tab === "students" ? "active" : ""} onClick={() => setTab("students")} aria-selected={tab === "students"}>
            <UsersRound size={17} aria-hidden="true" /> นักเรียน ({subject.studentCount.toLocaleString("th-TH")})
          </button>
        </nav>

        <div className="subject-detail-body">
          {tab === "schedule" && (
            <>
              <section className="subject-detail-facts" aria-label="สรุปรายวิชา">
                <Fact icon={UserRound} tone="violet" label="ครูผู้สอน" value={subject.teacherName || "ยังไม่ระบุ"} />
                <Fact icon={School} tone="blue" label="ชั้นเรียน" value={subject.className || subject.gradeLevel || "ยังไม่ระบุ"} />
                <Fact icon={Clock3} tone="amber" label={hasExactSchedules ? "จำนวนคาบต่อสัปดาห์" : "วันเรียนต่อสัปดาห์"} value={`${weeklyPeriods.toLocaleString("th-TH")} ${hasExactSchedules ? "คาบ" : "วัน"}`} />
                <Fact icon={UsersRound} tone="indigo" label="รวมนักเรียน" value={`${subject.studentCount.toLocaleString("th-TH")} คน`} />
              </section>

              <section className="subject-weekly-section">
                <div className="subject-weekly-heading">
                  <div><CalendarDays size={19} aria-hidden="true" /><h4>ตารางเรียนรายสัปดาห์</h4></div>
                  <button type="button" onClick={() => onEdit(subject)}><Pencil size={15} aria-hidden="true" /> แก้ไขตารางเรียน</button>
                </div>
                {!hasExactSchedules && <p className="subject-schedule-note">วันและเวลาที่บันทึกไว้ในรายวิชา ยังไม่มีตารางรายคาบที่ยืนยัน</p>}
                <div className="subject-weekly-list">
                  {hasExactSchedules ? schedules.map((schedule, index) => (
                    <ScheduleRow
                      key={schedule.id || index}
                      day={String(schedule.dayOfWeek)}
                      period={schedule.periodName || "คาบเรียน"}
                      time={`${schedule.startTime} – ${schedule.endTime}`}
                    />
                  )) : subject.studyDays.length ? subject.studyDays.map((day, index) => (
                    <ScheduleRow
                      key={`${day}-${index}`}
                      day={day}
                      period="เวลาหลัก"
                      time={subject.startTime && subject.endTime ? `${subject.startTime} – ${subject.endTime}` : "ยังไม่ระบุเวลา"}
                    />
                  )) : (
                    <div className="subject-detail-empty">ยังไม่มีข้อมูลตารางเรียนสำหรับรายวิชานี้</div>
                  )}
                </div>
              </section>
            </>
          )}

          {tab === "general" && (
            <section className="subject-general-panel">
              <dl>
                <Info label="รหัสวิชา" value={subject.subjectCode} />
                <Info label="ชื่อรายวิชา" value={subject.subjectName} />
                <Info label="หน่วยกิต" value={subject.credits || "ยังไม่ระบุ"} />
                <Info label="รูปแบบเช็คชื่อ" value={subject.attendanceMode === "EVERY_PERIOD" ? "เช็คชื่อทุกคาบ" : "เช็คชื่อคาบแรก"} />
                <Info label="สถานที่เรียน" value={subject.location || subject.className || "ยังไม่ระบุ"} />
                <Info label="สถานะ" value={subject.isActive ? "เปิดสอน" : "ปิดสอน"} />
              </dl>
              <div className="subject-description-block">
                <span>รายละเอียดรายวิชา</span>
                <p>{subject.description || "ยังไม่มีรายละเอียดเพิ่มเติม"}</p>
              </div>
              <button type="button" className="subject-detail-delete" disabled={busy} onClick={() => onDelete(subject)}>
                <Trash2 size={16} aria-hidden="true" /> {busy ? "กำลังลบ…" : "ลบรายวิชา"}
              </button>
            </section>
          )}

          {tab === "students" && (
            <section className="subject-students-panel">
              <span aria-hidden="true"><UsersRound size={30} /></span>
              <strong>{subject.studentCount.toLocaleString("th-TH")}</strong>
              <h4>นักเรียนในรายวิชานี้</h4>
              <p>นักเรียนที่อยู่ในห้อง {subject.className || "ที่กำหนด"} ซึ่งเชื่อมกับรายวิชานี้</p>
            </section>
          )}
        </div>

        <footer className="subject-detail-footer">
          <button type="button" className="secondary" onClick={() => onEdit(subject)}><CalendarDays size={17} aria-hidden="true" /> จัดการตารางเรียน</button>
          <button type="button" className="primary" onClick={() => onEdit(subject)}><Pencil size={17} aria-hidden="true" /> แก้ไขข้อมูลรายวิชา</button>
        </footer>
      </aside>
    </div>
  );
}

function Fact({ icon: Icon, tone, label, value }: { icon: typeof UserRound; tone: string; label: string; value: string }) {
  return <article className="subject-detail-fact"><span className={`tone-${tone}`}><Icon size={19} aria-hidden="true" /></span><div><small>{label}</small><strong>{value}</strong></div></article>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function ScheduleRow({ day, period, time }: { day: string; period: string; time: string }) {
  return <div className="subject-weekly-row"><span className={`day-pill ${dayColorClasses[day] || "day-default"}`}>{dayNames[day] || day}</span><b>{period || "คาบเรียน"}</b><time>{time}</time></div>;
}
