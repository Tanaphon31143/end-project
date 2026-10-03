"use client";
import { useState } from "react";
import { MoreVertical, Pencil, Trash2, UserRoundCog, ExternalLink } from "lucide-react";
import type { SubjectRecord } from "./types";
import { ScheduleDetailModal } from "./ScheduleDetailModal";

export default function SubjectTable({
  subjects,
  onEdit,
  onDelete,
  busyId,
}: {
  subjects: SubjectRecord[];
  onEdit: (s: SubjectRecord) => void;
  onDelete: (s: SubjectRecord) => void;
  busyId: number | null;
}) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectRecord | null>(null);

  return (
    <div className="subjects-table-wrap">
      <table className="subjects-data-table">
        <thead>
          <tr>
            <th className="th-num">#</th>
            <th className="th-code">รหัสวิชา</th>
            <th className="th-name">ชื่อรายวิชา</th>
            <th className="th-teacher">ครูผู้สอน</th>
            <th className="th-class">ชั้นเรียน</th>
            <th className="th-term">ภาคเรียน</th>
            <th className="th-schedule">วันและเวลาเรียน</th>
            <th className="th-status">สถานะ</th>
            <th className="th-actions">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {subjects.length ? (
            subjects.map((subject, index) => (
              <tr key={subject.databaseId}>
                <td className="td-num">{index + 1}</td>
                <td className="td-code">
                  <span className="subject-code-tag">{subject.subjectCode}</span>
                </td>
                <td className="td-name">
                  <div className="subject-title-cell">
                    <strong className="subject-title-text">{subject.subjectName}</strong>
                    <span className="subject-students-count">
                      {subject.studentCount.toLocaleString("th-TH")} นักเรียน
                    </span>
                  </div>
                </td>
                <td className="td-teacher">
                  <span className="subject-teacher-name">{subject.teacherName}</span>
                </td>
                <td className="td-class">
                  <span className="subject-class-tag">{subject.className}</span>
                </td>
                <td className="td-term">
                  <span className="subject-term-tag">
                    {subject.semester}/{subject.academicYear}
                  </span>
                </td>
                <td className="td-schedule">
                  {renderSchedule(subject, () => setSelectedSubject(subject))}
                </td>
                <td className="td-status">
                  <span
                    className={`subject-status-pill ${
                      subject.isActive ? "active" : "inactive"
                    }`}
                  >
                    <span className="status-dot" />
                    {subject.isActive ? "เปิดสอน" : "ปิดสอน"}
                  </span>
                </td>
                <td className="td-actions">
                  <details className="subject-row-menu">
                    <summary aria-label={`เปิดเมนูจัดการ ${subject.subjectName}`}>
                      <MoreVertical size={16} />
                    </summary>
                    <div className="subject-row-menu-panel">
                      <button onClick={() => onEdit(subject)}>
                        <Pencil size={14} /> แก้ไขรายวิชา
                      </button>
                      <button onClick={() => onEdit(subject)}>
                        <UserRoundCog size={14} /> เปลี่ยนครูผู้สอน
                      </button>
                      <button
                        className="danger"
                        disabled={busyId === subject.databaseId}
                        onClick={() => onDelete(subject)}
                      >
                        <Trash2 size={14} />
                        {busyId === subject.databaseId ? "กำลังลบ…" : "ลบรายวิชา"}
                      </button>
                    </div>
                  </details>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9}>
                <div className="subject-empty">
                  <span>ไม่พบรายวิชาที่ตรงกับตัวกรอง</span>
                  <p>ลองเปลี่ยนคำค้นหาหรือชั้นเรียน แล้วค้นหาอีกครั้ง</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Schedule Detail Modal for All Subjects */}
      {selectedSubject && (
        <ScheduleDetailModal
          subject={selectedSubject}
          onClose={() => setSelectedSubject(null)}
        />
      )}
    </div>
  );
}

const dayNames: Record<string, string> = {
  "1": "จันทร์",
  "2": "อังคาร",
  "3": "พุธ",
  "4": "พฤหัสบดี",
  "5": "ศุกร์",
  "6": "เสาร์",
  "7": "อาทิตย์",
};

const dayShortNames: Record<string, string> = {
  "1": "จ.",
  "2": "อ.",
  "3": "พ.",
  "4": "พฤ.",
  "5": "ศ.",
  "6": "ส.",
  "7": "อา.",
};

function formatDays(days: string[]) {
  if (!days.length) return "ยังไม่ระบุวัน";
  return days.map((day) => dayNames[day] || day).join(", ");
}

function formatTime(start: string, end: string, location: string) {
  const time = start && end ? `${start}–${end}` : "ยังไม่ระบุเวลา";
  return location ? `${time} · ${location}` : time;
}

function renderSchedule(subject: SubjectRecord, onOpenModal: () => void) {
  const { schedules, studyDays, startTime, endTime, location, scheduleSource } = subject;

  // Subject-level data records days and one shared time range, not individual periods.
  if (scheduleSource !== "SCHEDULE" || !schedules || schedules.length === 0) {
    const days = formatDays(studyDays);
    const time = formatTime(startTime, endTime, location);
    const count = studyDays.length;

    return (
      <button
        type="button"
        className="schedule-cell-interactive"
        onClick={onOpenModal}
        title="ดูข้อมูลวันและเวลาที่บันทึกไว้"
      >
        <div className="schedule-header-inline">
          <span className="schedule-day-label">{days}</span>
          <span className="schedule-count-badge">
            {count ? `${count} วัน` : "ข้อมูลเดิม"}
          </span>
        </div>
        <div className="schedule-time-row">
          <span className="schedule-time-label">{time}</span>
          <ExternalLink size={13} className="schedule-icon-hint" />
        </div>
      </button>
    );
  }

  // Case: 1 schedule record
  if (schedules.length === 1) {
    const s = schedules[0];
    const day = dayNames[String(s.dayOfWeek)] || `วัน ${s.dayOfWeek}`;
    const time = `${s.startTime}–${s.endTime}`;

    return (
      <button
        type="button"
        className="schedule-cell-interactive"
        onClick={onOpenModal}
        title="คลิกเพื่อดูตารางเรียนรายคาบ"
      >
        <div className="schedule-header-inline">
          <span className="schedule-day-label">{day}</span>
          <span className="schedule-count-badge">1 คาบ</span>
        </div>
        <div className="schedule-time-row">
          <span className="schedule-time-label">{time}</span>
          <ExternalLink size={13} className="schedule-icon-hint" />
        </div>
      </button>
    );
  }

  // Case: Multiple schedules
  const firstTime = `${schedules[0].startTime}–${schedules[0].endTime}`;
  const allSameTime = schedules.every((s) => `${s.startTime}–${s.endTime}` === firstTime);

  const sortedDays = [...schedules].map((s) => s.dayOfWeek).sort((a, b) => a - b);
  const isMonFri = sortedDays.length === 5 && sortedDays.join("") === "12345";

  let dayLabel = "";
  if (isMonFri) {
    dayLabel = "จันทร์–ศุกร์";
  } else if (sortedDays.length <= 3) {
    dayLabel = sortedDays.map((d) => dayNames[String(d)] || String(d)).join(", ");
  } else {
    dayLabel = sortedDays.map((d) => dayShortNames[String(d)] || String(d)).join(", ");
  }

  // If 2 schedules with different times
  if (schedules.length === 2 && !allSameTime) {
    return (
      <button
        type="button"
        className="schedule-cell-interactive"
        onClick={onOpenModal}
        title="คลิกเพื่อดูตารางเรียนรายคาบ"
      >
        <div className="schedule-header-inline">
          <span className="schedule-day-label">{dayLabel}</span>
          <span className="schedule-count-badge">2 คาบ</span>
        </div>
        <div className="schedule-time-row">
          <div className="schedule-pair-list">
            {schedules.map((s) => (
              <span key={s.id} className="schedule-pair-inline">
                <b>{dayShortNames[String(s.dayOfWeek)] || s.dayOfWeek}</b> {s.startTime}–{s.endTime}
              </span>
            ))}
          </div>
          <ExternalLink size={13} className="schedule-icon-hint" />
        </div>
      </button>
    );
  }

  // If all share same time
  if (allSameTime) {
    return (
      <button
        type="button"
        className="schedule-cell-interactive"
        onClick={onOpenModal}
        title="คลิกเพื่อดูตารางเรียนรายคาบ"
      >
        <div className="schedule-header-inline">
          <span className="schedule-day-label">{dayLabel}</span>
          <span className="schedule-count-badge">{schedules.length} คาบ</span>
        </div>
        <div className="schedule-time-row">
          <span className="schedule-time-label">{firstTime}</span>
          <ExternalLink size={13} className="schedule-icon-hint" />
        </div>
      </button>
    );
  }

  // 3+ schedules with varying times
  const earliestStart = schedules.reduce((min, s) => (s.startTime < min ? s.startTime : min), schedules[0].startTime);
  const latestEnd = schedules.reduce((max, s) => (s.endTime > max ? s.endTime : max), schedules[0].endTime);

  return (
    <button
      type="button"
      className="schedule-cell-interactive"
      onClick={onOpenModal}
      title="คลิกเพื่อดูตารางเรียนรายคาบ"
    >
      <div className="schedule-header-inline">
        <span className="schedule-day-label">{dayLabel}</span>
        <span className="schedule-count-badge">{schedules.length} คาบ</span>
      </div>
      <div className="schedule-time-row">
        <span className="schedule-time-label">{earliestStart}–{latestEnd}</span>
        <ExternalLink size={13} className="schedule-icon-hint" />
      </div>
    </button>
  );
}
