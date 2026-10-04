"use client";
import DateTimeInput from "@/components/forms/DateTimeInput";


import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Filter,
  House,
  MoreVertical,
  RotateCcw,
  Search,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import styles from "./AttendanceHistorySummary.module.css";
import type { StudentAttendance } from "@/lib/student-data";

type StatusKey = "present" | "late" | "absent" | "leave";
type CourseOption = { id: number; name: string };
type Props = {
  records: StudentAttendance[];
  courses: CourseOption[];
  counts: Record<StatusKey, number>;
  totalScoped: number;
  totalAll: number;
  from?: string;
  to?: string;
  subject?: string;
  status?: string;
  invalidRange?: boolean;
};

const STATUS_STYLE: Record<StatusKey, { label: string; recordLabel: StudentAttendance["status"]; className: string; icon: typeof Check }> = {
  present: { label: "มา", recordLabel: "มาเรียน", className: "is-present", icon: Check },
  late: { label: "สาย", recordLabel: "สาย", className: "is-late", icon: Clock3 },
  absent: { label: "ขาด", recordLabel: "ขาด", className: "is-absent", icon: UserX },
  leave: { label: "ลา", recordLabel: "ลา", className: "is-leave", icon: FileText },
};
const STATUS_FROM_RECORD: Record<StudentAttendance["status"], StatusKey> = { มาเรียน: "present", สาย: "late", ขาด: "absent", ลา: "leave" };
const statusKeys = Object.keys(STATUS_STYLE) as StatusKey[];

function statusKey(value: string): StatusKey | undefined { return value in STATUS_STYLE ? value as StatusKey : undefined; }
function rateFor(counts: Record<StatusKey, number>, total: number) { return total ? Math.round(((counts.present + counts.late) / total) * 100) : null; }
function parseRecordDate(date: string) { const [day, month, year] = date.split("/").map(Number); return new Date(year, month - 1, day); }
function isoDate(date: string) { const [day, month, year] = date.split("/"); return `${year}-${month}-${day}`; }

export default function AttendanceHistoryView({ records, courses, counts, totalScoped, totalAll, from, to, subject, status, invalidRange = false }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const firstRecordDate = records[0] ? parseRecordDate(records[0].date) : new Date();
  const [calendarMonth, setCalendarMonth] = useState(new Date(firstRecordDate.getFullYear(), firstRecordDate.getMonth(), 1));
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const selectedStatus = statusKey(status || "");
  const rate = rateFor(counts, totalScoped);
  const visibleRecords = useMemo(() => {
    const value = search.trim().toLocaleLowerCase("th");
    return value ? records.filter((record) => `${record.subject} ${record.subjectCode}`.toLocaleLowerCase("th").includes(value)) : records;
  }, [records, search]);
  const totalPages = Math.max(1, Math.ceil(visibleRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = visibleRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const monthRecords = useMemo(() => records.filter((record) => { const date = parseRecordDate(record.date); return date.getMonth() === calendarMonth.getMonth() && date.getFullYear() === calendarMonth.getFullYear(); }), [records, calendarMonth]);
  const recordsByDay = useMemo(() => {
    const map = new Map<number, StudentAttendance[]>();
    monthRecords.forEach((record) => { const day = parseRecordDate(record.date).getDate(); map.set(day, [...(map.get(day) || []), record]); });
    return map;
  }, [monthRecords]);
  const monthCounts = useMemo(() => monthRecords.reduce((result, record) => { result[STATUS_FROM_RECORD[record.status]] += 1; return result; }, { present: 0, late: 0, absent: 0, leave: 0 }), [monthRecords]);
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(), totalDays = new Date(year, month + 1, 0).getDate();
    return [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, index) => index + 1)];
  }, [calendarMonth]);

  function navigateWithStatus(nextStatus: StatusKey | "") {
    const params = new URLSearchParams();
    if (from) params.set("from", from); if (to) params.set("to", to); if (subject) params.set("subject", subject); if (nextStatus) params.set("status", nextStatus);
    router.push(`/student/attendance/history${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="attendance-history-page">
      <nav className="attendance-history-breadcrumb" aria-label="เส้นทางนำทาง"><Link href="/student/dashboard"><House aria-hidden="true" />หน้าหลัก</Link><ChevronRight aria-hidden="true" /><span>ประวัติการเข้าเรียน</span></nav>
      <header className="attendance-history-head">
        <div className="attendance-history-heading-copy"><span className="attendance-history-title-icon"><Clock3 aria-hidden="true" /></span><div><h1>ประวัติการเข้าเรียน</h1><p>ค้นหาและตรวจสอบข้อมูลการเข้าเรียนย้อนหลัง</p></div></div>
        <div className={styles.summary}>
          <div className={styles.rateCard} aria-label={rate === null ? "ยังไม่มีข้อมูลอัตราการเข้าเรียน" : `อัตราการเข้าเรียนรวม ${rate}%`}>
            <span className={styles.label}>อัตราการเข้าเรียนรวม</span>
            <div className={styles.ring} aria-hidden="true" style={{ "--history-rate": `${rate ?? 0}` } as React.CSSProperties}><strong>{rate === null ? "—" : `${rate}%`}</strong></div>
          </div>
        </div>
      </header>

      <section className="attendance-status-summary" aria-label="สรุปสถานะการเข้าเรียน">
        {statusKeys.map((key) => { const item = STATUS_STYLE[key], Icon = item.icon, active = selectedStatus === key, percent = totalScoped ? ((counts[key] / totalScoped) * 100).toFixed(1) : "0.0"; return <button type="button" key={key} className={`attendance-status-card ${item.className}${active ? " is-selected" : ""}`} aria-pressed={active} onClick={() => navigateWithStatus(active ? "" : key)}>
          <span className="attendance-status-dot"><Icon aria-hidden="true" /></span><span className="attendance-status-copy"><small>{item.label}</small><strong>{counts[key].toLocaleString("th-TH")} <em>ครั้ง</em></strong><span>{percent}% ของทั้งหมด</span></span><BarChart3 className="attendance-status-chart" aria-hidden="true" />
        </button>; })}
      </section>

      <div className="attendance-history-dashboard">
        <main className="attendance-history-main">
          <form className="attendance-history-filters" method="get">
            <header><Filter aria-hidden="true" /><h2>ค้นหาข้อมูลการเข้าเรียน</h2></header>
            <label className="attendance-history-search"><span>ค้นหารายวิชาหรือรหัสวิชา</span><div><Search aria-hidden="true" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="พิมพ์ชื่อวิชาหรือรหัสวิชา..." /></div></label>
            <fieldset className="attendance-history-date-range"><legend>ช่วงวันที่</legend><DateTimeInput aria-label="จากวันที่" name="from" type="date" defaultValue={from} /><span>-</span><DateTimeInput aria-label="ถึงวันที่" name="to" type="date" defaultValue={to} /></fieldset>
            <label className="attendance-history-subject"><span>รายวิชา</span><select name="subject" defaultValue={subject || ""}><option value="">ทุกรายวิชา</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
            <div className="attendance-history-status-tabs" aria-label="สถานะการเข้าเรียน"><span>สถานะการเข้าเรียน</span><div><button type="button" className={!selectedStatus ? "is-active" : ""} onClick={() => navigateWithStatus("")}>ทั้งหมด</button>{statusKeys.map((key) => { const Icon = STATUS_STYLE[key].icon; return <button type="button" key={key} className={`${STATUS_STYLE[key].className}${selectedStatus === key ? " is-active" : ""}`} onClick={() => navigateWithStatus(selectedStatus === key ? "" : key)}><Icon aria-hidden="true" />{STATUS_STYLE[key].label}</button>; })}</div></div>
            <div className="attendance-history-filter-actions"><a className="button attendance-history-clear filter-reset-button" href="/student/attendance/history"><RotateCcw aria-hidden="true" />ล้างตัวกรอง</a><button className="button primary" type="submit"><Search aria-hidden="true" />ค้นหา</button></div>
            {invalidRange && <small className="attendance-history-range-error" role="alert">ช่วงวันที่ไม่ถูกต้อง</small>}
          </form>

          <section className="attendance-history-list card" aria-labelledby="attendance-history-list-title">
            <header className="attendance-history-list-head"><div><CalendarDays aria-hidden="true" /><div><h2 id="attendance-history-list-title">รายการเข้าเรียน</h2><p>พบ {visibleRecords.length.toLocaleString("th-TH")} รายการ · แสดงข้อมูลล่าสุดก่อน</p></div></div></header>
            {paginatedRecords.length ? <>
              <div className="attendance-history-table-wrap"><table className="attendance-history-table"><thead><tr><th>วันที่</th><th>เวลา</th><th>รายวิชา</th><th>รหัสวิชา</th><th>สถานะ</th><th>หมายเหตุ</th><th>จัดการ</th></tr></thead><tbody>{paginatedRecords.map((record) => { const key = STATUS_FROM_RECORD[record.status]; const StatusIcon = STATUS_STYLE[key].icon; return <tr key={record.id}><td>{record.date}</td><td>{record.checkIn !== "-" ? record.checkIn : record.classTime.split("–")[0]}</td><td><strong>{record.subject}</strong></td><td>{record.subjectCode}</td><td><span className={`attendance-history-badge ${STATUS_STYLE[key].className}`}><StatusIcon aria-hidden="true" />{STATUS_STYLE[key].label}</span></td><td>{record.note || "-"}</td><td><details className="attendance-history-actions"><summary aria-label={`จัดการรายการ ${record.subject}`}><MoreVertical aria-hidden="true" /></summary><div>{record.status === "ขาด" ? <Link href={`/student/attendance/report?subject=${record.subjectId || ""}&date=${isoDate(record.date)}`}>แจ้งปัญหาการเช็คชื่อ</Link> : <span>ไม่มีรายการเพิ่มเติม</span>}</div></details></td></tr>; })}</tbody></table></div>
              <div className="attendance-history-mobile-list">{paginatedRecords.map((record) => { const key = STATUS_FROM_RECORD[record.status]; return <article key={record.id} className="attendance-history-mobile-card"><div className="attendance-history-mobile-top"><strong>{record.date}</strong><span className={`attendance-history-badge ${STATUS_STYLE[key].className}`}>{record.status}</span></div><strong className="attendance-history-mobile-subject">{record.subject}</strong><small>{record.subjectCode} · {record.classTime || "-"}</small><div className="attendance-history-mobile-note">เข้าเรียน {record.checkIn || "-"} · {record.note || "-"}</div>{record.status === "ขาด" && <Link href={`/student/attendance/report?subject=${record.subjectId || ""}&date=${isoDate(record.date)}`}>แจ้งปัญหาการเช็คชื่อ</Link>}</article>; })}</div>
              <footer className="attendance-history-pagination"><span>แสดง {paginatedRecords.length} รายการจากทั้งหมด {visibleRecords.length} รายการ</span><nav aria-label="เปลี่ยนหน้าตาราง"><button type="button" disabled={currentPage === 1} onClick={() => setPage(1)} aria-label="หน้าแรก">«</button><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="หน้าก่อนหน้า">‹</button><b>{currentPage}</b><button type="button" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="หน้าถัดไป">›</button><button type="button" disabled={currentPage === totalPages} onClick={() => setPage(totalPages)} aria-label="หน้าสุดท้าย">»</button></nav></footer>
            </> : <div className="attendance-history-empty"><CalendarDays aria-hidden="true" /><strong>{totalAll ? "ไม่พบรายการ ลองปรับตัวกรองใหม่" : "ยังไม่มีประวัติการเข้าเรียน"}</strong><p>{totalAll ? "ลองเปลี่ยนช่วงวันที่ รายวิชา หรือสถานะ" : "ข้อมูลจะแสดงเมื่อมีการบันทึกการเข้าเรียน"}</p>{totalAll > 0 && <a className="button attendance-history-clear filter-reset-button" href="/student/attendance/history">ล้างตัวกรอง</a>}</div>}
          </section>
        </main>

        <aside className="attendance-history-side">
          <section className="attendance-history-calendar" aria-label="ปฏิทินการเข้าเรียน">
            <div className="attendance-history-side-title"><CalendarDays aria-hidden="true" /><h2>ปฏิทินการเข้าเรียน</h2></div>
            <div className="attendance-history-calendar-legend" aria-label="คำอธิบายสถานะ">{statusKeys.map((key) => <span key={key}><i className={`is-${key}`} />{STATUS_STYLE[key].label}</span>)}</div>
            <header><button type="button" aria-label="เดือนก่อนหน้า" onClick={() => { setSelectedCalendarDay(null); setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)); }}><ChevronLeft /></button><strong>{new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(calendarMonth)}</strong><button type="button" aria-label="เดือนถัดไป" onClick={() => { setSelectedCalendarDay(null); setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)); }}><ChevronRight /></button></header>
            <div className="attendance-history-calendar-grid">{["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => <span className="weekday" key={day}>{day}</span>)}{calendarDays.map((day, index) => { const dayRecords = day ? recordsByDay.get(day) || [] : []; const today = new Date(); const isToday = day === today.getDate() && calendarMonth.getMonth() === today.getMonth() && calendarMonth.getFullYear() === today.getFullYear(); const primaryKey = dayRecords.length ? STATUS_FROM_RECORD[dayRecords.find((record) => record.status === "ขาด")?.status || dayRecords[0].status] : undefined; return day ? <button type="button" key={`${day}-${index}`} className={`${isToday ? "is-today " : ""}${selectedCalendarDay === day ? "is-selected " : ""}${primaryKey ? `has-${primaryKey}` : ""}`} aria-pressed={selectedCalendarDay === day} aria-label={`${day} ${new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(calendarMonth)}${dayRecords.length ? ` ${dayRecords.map((record) => record.status).join(" ")}` : " ไม่มีรายการ"}`} onClick={() => setSelectedCalendarDay(selectedCalendarDay === day ? null : day)}><strong>{day}</strong>{primaryKey && <small>{STATUS_STYLE[primaryKey].label}</small>}{dayRecords.length > 0 && <i>{[...new Set(dayRecords.map((record) => STATUS_FROM_RECORD[record.status]))].map((key) => <b key={key} className={`is-${key}`} />)}</i>}</button> : <span key={`empty-${index}`} className="is-empty" />; })}</div>
          </section>
          <section className="attendance-history-month-summary">
            <header><h2>สรุปในเดือนนี้</h2><span>{monthRecords.length} ครั้ง</span></header>
            <div>{statusKeys.map((key) => {
              const Icon = STATUS_STYLE[key].icon;
              const percentage = monthRecords.length ? Math.round(monthCounts[key] / monthRecords.length * 100) : 0;
              return <span key={key} className={`attendance-month-stat is-${key}`}>
                <span className="attendance-month-stat-icon"><Icon aria-hidden="true" /></span>
                <small>{STATUS_STYLE[key].label}</small>
                <strong>{monthCounts[key]} <em>ครั้ง</em></strong>
                <span className="attendance-month-stat-ratio">{percentage}%</span>
                <span className="attendance-month-stat-track" aria-hidden="true"><span style={{ transform: `scaleX(${percentage / 100})` }} /></span>
              </span>;
            })}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
