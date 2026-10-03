"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ATTENDANCE_THRESHOLD,
  STATUS_ORDER,
  STATUS_STYLE,
  dateKey,
  dominantStatus,
  monthCells,
  monthKey,
  type AttendanceDayRecord,
  type AttendanceStatus,
} from "@/lib/attendance-stats";
import type { StudentStats } from "@/lib/student-data";

type Props = {
  summary: StudentStats["summary"];
  subjects: StudentStats["subjects"];
  attendanceDays: AttendanceDayRecord[];
  selectedSubject?: number;
  initialStatus?: AttendanceStatus | null;
};

const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const weekDays = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function countStatus(records: AttendanceDayRecord[], status: AttendanceStatus) {
  return records.filter((record) => record.status === status).length;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${day} ${monthNames[month - 1]} ${year}`;
}

export default function AttendanceOverview({ summary, subjects, attendanceDays, selectedSubject, initialStatus = null }: Props) {
  const router = useRouter();
  const hasData = attendanceDays.length > 0;
  const latest = attendanceDays.reduce((latestDate, item) => item.date > latestDate ? item.date : latestDate, attendanceDays[0]?.date || "");
  const latestParts = latest ? latest.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1, 1];
  const [month, setMonth] = useState({ year: latestParts[0], month: latestParts[1] - 1 });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<AttendanceStatus | null>(initialStatus);
  const [animatedPresent, setAnimatedPresent] = useState(0);

  useEffect(() => {
    if (!hasData) return;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 500);
      setAnimatedPresent(Math.round(summary.present * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hasData, summary.present]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceDayRecord[]>();
    attendanceDays.forEach((record) => map.set(record.date, [...(map.get(record.date) || []), record]));
    return map;
  }, [attendanceDays]);
  const cells = monthCells(month.year, month.month);
  const monthRecords = attendanceDays.filter((record) => monthKey(record.date) === `${month.year}-${String(month.month + 1).padStart(2, "0")}`);
  const selectedRecords = selectedDate ? recordsByDate.get(selectedDate) || [] : [];
  const rate = hasData ? Math.round(summary.rate) : null;
  const threshold = ATTENDANCE_THRESHOLD * 100;

  function moveMonth(delta: number) {
    setSelectedDate(null);
    setMonth((current) => {
      const next = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  }

  function toggleSubject(id: number) {
    const params = new URLSearchParams(window.location.search);
    if (selectedSubject === id) params.delete("subject");
    else params.set("subject", String(id));
    router.replace(`/student/attendance/statistics${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="attendance-overview">
      <section className="attendance-hero" aria-labelledby="attendance-hero-title">
        <div className="attendance-hero-copy" aria-live="polite">
          <h2 id="attendance-hero-title">
            {hasData ? <>คุณเข้าเรียน <strong>{animatedPresent + summary.late}</strong> จาก <strong>{summary.total}</strong> คาบ</> : "ยังไม่มีข้อมูลการเข้าเรียน"}
          </h2>
          <p>{hasData ? <>อัตราการเข้าเรียน {rate}% {summary.absent > 0 && <>· ขาดเรียน {summary.absent} คาบ</>}</> : "เมื่อมีการเช็คชื่อ สถิติจะแสดงที่นี่"}</p>
        </div>
        <div className="attendance-status-bar" role="img" aria-label={`มา ${summary.present} คาบ สาย ${summary.late} คาบ ลา ${summary.leave} คาบ ขาด ${summary.absent} คาบ`}>
          {hasData ? STATUS_ORDER.map((status) => {
            const count = countStatus(attendanceDays, status);
            if (!count) return null;
            return <span key={status} className={`attendance-status-segment is-${status.toLowerCase()}${activeStatus && activeStatus !== status ? " is-dimmed" : ""}`} style={{ width: `${(count / summary.total) * 100}%` }} />;
          }) : <span className="attendance-status-segment is-empty" />}
          <span className="attendance-threshold" style={{ left: `${threshold}%` }}><span>เกณฑ์เวลาเรียน {threshold}%</span></span>
        </div>
        <p className={`attendance-threshold-note ${rate !== null && rate >= threshold ? "is-pass" : "is-warning"}`}>
          {rate !== null && rate >= threshold ? `อยู่ในเกณฑ์เวลาเรียน ${threshold}% ขึ้นไป` : `ต่ำกว่าเกณฑ์เวลาเรียน ${threshold}%`}
        </p>
        <div className="attendance-status-legend" aria-label="กรองตามสถานะ">
          {STATUS_ORDER.map((status) => {
            const count = countStatus(attendanceDays, status);
            const style = STATUS_STYLE[status];
            return <button key={status} type="button" className={`attendance-legend-item${activeStatus === status ? " is-selected" : ""}`} aria-pressed={activeStatus === status} onClick={() => {
              const next = activeStatus === status ? null : status;
              setActiveStatus(next);
              const params = new URLSearchParams(window.location.search);
              if (next) params.set("status", next.toLowerCase()); else params.delete("status");
              router.replace(`/student/attendance/statistics${params.toString() ? `?${params}` : ""}`);
            }}>
              <span className="attendance-legend-dot" style={{ backgroundColor: style.color }} />
              <span>{style.shortLabel}</span><strong>{count}</strong>
            </button>;
          })}
        </div>
      </section>

      <section className="attendance-calendar-section" aria-labelledby="attendance-calendar-title">
        <div className="attendance-section-heading">
          <h2 id="attendance-calendar-title">ปฏิทินการเข้าเรียน</h2>
          <div className="attendance-month-nav">
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => moveMonth(-1)}><ChevronLeft aria-hidden="true" /></button>
            <strong>{monthNames[month.month]} {month.year}</strong>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => moveMonth(1)}><ChevronRight aria-hidden="true" /></button>
          </div>
        </div>
        <div className="attendance-calendar" role="grid" aria-label={`ปฏิทิน ${monthNames[month.month]} ${month.year}`}>
          {weekDays.map((day) => <span className="attendance-calendar-weekday" key={day}>{day}</span>)}
          {cells.map((day, index) => {
            if (!day) return <span className="attendance-calendar-day is-blank" key={`blank-${index}`} />;
            const key = dateKey(month.year, month.month, day);
            const dayRecords = recordsByDate.get(key) || [];
            const dominant = dominantStatus(dayRecords);
            const isActive = selectedDate === key;
            const isDimmed = Boolean(activeStatus && dominant && dominant !== activeStatus);
            return <button key={key} type="button" className={`attendance-calendar-day${dominant ? ` is-${dominant.toLowerCase()}` : ""}${isActive ? " is-selected" : ""}${isDimmed ? " is-dimmed" : ""}`} disabled={!dominant} aria-label={dominant ? `${formatDate(key)} ${STATUS_STYLE[dominant].label} ${dayRecords.length} คาบ` : formatDate(key)} aria-pressed={isActive} onClick={() => setSelectedDate(isActive ? null : key)}>
              <strong>{day}</strong>{dayRecords.length > 1 && <small>×{dayRecords.length}</small>}
            </button>;
          })}
        </div>
        <div className={`attendance-day-details${selectedDate ? " is-open" : ""}`} aria-live="polite">
          {!selectedDate ? <p>แตะวันที่ที่มีสีเพื่อดูรายละเอียด</p> : selectedRecords.map((record, index) => <div className="attendance-day-detail" key={`${record.date}-${record.subjectCode}-${index}`}>
            <div><strong>{formatDate(record.date)}</strong><span>{record.subjectName} ({record.subjectCode})</span><small>{record.classTime}{record.note ? ` · ${record.note}` : ""}</small></div>
            <b className={`is-${record.status.toLowerCase()}`}>{STATUS_STYLE[record.status].label}</b>
          </div>)}
        </div>
        {!monthRecords.length && <p className="attendance-calendar-empty">เดือนนี้ยังไม่มีการบันทึกการเข้าเรียน</p>}
      </section>

      <section className="attendance-subject-section" aria-labelledby="attendance-subject-title">
        <div className="attendance-section-heading"><h2 id="attendance-subject-title">รายวิชา</h2><span>{subjects.length} รายวิชา</span></div>
        <div className="attendance-subject-list">
          {subjects.length ? subjects.map((subject, index) => {
            const subjectRate = subject.total ? Math.round(subject.value) : null;
            return <button type="button" key={subject.id} className={`attendance-subject-row${selectedSubject === subject.id ? " is-selected" : ""}`} onClick={() => toggleSubject(subject.id)} style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}>
              <span className="attendance-subject-name"><strong>{subject.name}</strong><small>{subject.code}</small></span>
              <span className="attendance-subject-bar" role="img" aria-label={`${subject.name} มา ${subject.present} สาย ${subject.late} ลา ${subject.leave} ขาด ${subject.absent}`}>
                {STATUS_ORDER.map((status) => { const count = subject[status.toLowerCase() as "present" | "late" | "leave" | "absent"]; return count ? <i key={status} className={`is-${status.toLowerCase()}`} style={{ width: `${(count / subject.total) * 100}%` }} /> : null; })}
              </span>
              <span className={`attendance-subject-rate${subjectRate !== null && subjectRate >= threshold ? " is-pass" : " is-warning"}`}><strong>{subjectRate === null ? "-" : `${subjectRate}%`}</strong><small>{subject.total ? `${subject.present + subject.late}/${subject.total} คาบ` : "ยังไม่มีข้อมูล"}</small></span>
            </button>;
          }) : <p className="attendance-subject-empty">ไม่มีข้อมูล</p>}
        </div>
      </section>
    </div>
  );
}
