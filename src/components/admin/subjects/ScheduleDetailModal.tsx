"use client";
import { useEffect } from "react";
import { X, Calendar, Clock, MapPin, School, BookOpen } from "lucide-react";
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

const thaiDayKeys: Record<string, string> = Object.fromEntries(
  Object.entries(dayNames).map(([key, value]) => [value, key]),
);

function dayLabel(value: string | number) {
  const key = String(value);
  return dayNames[key] || (thaiDayKeys[key] ? key : `วันที่ ${key}`);
}

function dayColor(value: string | number) {
  const key = String(value);
  return dayColorClasses[key] || dayColorClasses[thaiDayKeys[key]] || "day-default";
}

function compactDays(days: string[]) {
  if (!days.length) return "ยังไม่ระบุวัน";
  const normalized = days.map(dayLabel);
  if (
    normalized.length === 5 &&
    ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"].every((day) => normalized.includes(day))
  ) {
    return "จันทร์–ศุกร์";
  }
  return normalized.join(", ");
}

type Props = {
  subject: SubjectRecord | null;
  onClose: () => void;
};

export function ScheduleDetailModal({ subject, onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!subject) return null;

  const schedules = subject.schedules || [];
  const hasExactSchedules = subject.scheduleSource === "SCHEDULE" && schedules.length > 0;
  const dayCount = subject.studyDays?.length || 0;
  const summaryDays = compactDays(subject.studyDays || []);

  return (
    <div
      className="schedule-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="schedule-modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
      >
        {/* Header */}
        <div className="schedule-modal-head">
          <div className="schedule-modal-title-group">
            <div className="schedule-modal-icon">
              <Clock size={20} />
            </div>
            <div>
              <h2 id="schedule-modal-title">ตารางเรียนรายคาบ</h2>
              <p>
                <b className="text-blue-700">{subject.subjectCode}</b> {subject.subjectName} · {subject.className}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="schedule-modal-close"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Info Bar */}
        <div className="schedule-modal-info-bar">
          <div className="info-bar-item">
            <BookOpen size={15} />
            <div>
              <span>ครูผู้สอน</span>
              <strong>{subject.teacherName || "-"}</strong>
            </div>
          </div>
          <div className="info-bar-item">
            <School size={15} />
            <div>
              <span>ภาคเรียน / ปีการศึกษา</span>
              <strong>{subject.semester}/{subject.academicYear}</strong>
            </div>
          </div>
          <div className="info-bar-item">
            <Clock size={15} />
            <div>
              <span>{hasExactSchedules ? "จำนวนคาบเรียน" : "วันที่เปิดสอน"}</span>
              <strong>
                {hasExactSchedules
                  ? `${schedules.length} คาบ / สัปดาห์`
                  : dayCount
                    ? `${dayCount} วัน / สัปดาห์`
                    : "ยังไม่ระบุ"}
              </strong>
            </div>
          </div>
          <div className="info-bar-item">
            <MapPin size={15} />
            <div>
              <span>ห้องเรียน / สถานที่</span>
              <strong>{subject.location || subject.className || "ยังไม่ระบุ"}</strong>
            </div>
          </div>
        </div>

        {/* Schedule Periods Table */}
        <div className="schedule-modal-body">
          <h3 className="schedule-modal-section-title">
            <Calendar size={16} />
            {hasExactSchedules
              ? `รายการคาบเรียนและเวลา (${schedules.length} คาบ)`
              : "วันและเวลาที่บันทึกไว้"}
          </h3>

          <p className={`schedule-modal-source ${hasExactSchedules ? "verified" : "legacy"}`}>
            {hasExactSchedules
              ? "ข้อมูลรายคาบจริงจากตารางสอนในระบบ"
              : subject.scheduleSource === "LEGACY_SUBJECT"
                ? "ข้อมูลเดิมของรายวิชา ยังไม่มีตารางรายคาบที่ครูยืนยันในระบบ"
                : "ข้อมูลวันและเวลาระดับรายวิชา ยังไม่มีตารางรายคาบที่ครูยืนยันในระบบ"}
          </p>

          <div className="schedule-modal-table-wrap">
            <table className="schedule-modal-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>วันเรียน</th>
                  <th>คาบที่</th>
                  <th>เวลาเรียน</th>
                  <th>รายละเอียด / ห้องเรียน</th>
                </tr>
              </thead>
              <tbody>
                {hasExactSchedules ? (
                  schedules.map((s, idx) => (
                    <tr key={s.id || idx}>
                      <td className="col-idx">{idx + 1}</td>
                      <td>
                        <span className={`day-pill ${dayColor(s.dayOfWeek)}`}>
                          {dayLabel(s.dayOfWeek)}
                        </span>
                      </td>
                      <td className="col-period">
                        <span className="period-number">
                          {s.periodName === "คาบเรียน" ? `คาบที่ ${idx + 1}` : s.periodName}
                        </span>
                      </td>
                      <td className="col-time">
                        <strong className="time-range">{s.startTime} – {s.endTime}</strong>
                      </td>
                      <td className="col-desc">
                        <span className="period-default">
                          {subject.location || subject.className || "ยังไม่ระบุห้องเรียน"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="col-idx">1</td>
                    <td>
                      <span className="schedule-days-summary">{summaryDays}</span>
                    </td>
                    <td className="col-period">
                      <span className="period-number">ช่วงเวลาหลัก</span>
                    </td>
                    <td className="col-time">
                      <strong className="time-range">
                        {subject.startTime && subject.endTime
                          ? `${subject.startTime} – ${subject.endTime}`
                          : "ยังไม่ระบุเวลา"}
                      </strong>
                    </td>
                      <td className="col-desc">
                        <span className="period-default">
                          {subject.location || subject.className || "ยังไม่ระบุห้องเรียน"}
                        </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="schedule-modal-footer">
          <button
            type="button"
            className="schedule-modal-btn-close"
            onClick={onClose}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
