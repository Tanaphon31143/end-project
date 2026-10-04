"use client";

import DateTimeInput from "@/components/forms/DateTimeInput";
import { BookOpen, CalendarDays, ChevronDown, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import StatisticsDropdown from "./StatisticsDropdown";

type AttendanceFiltersProps = {
  selectedTerm: string;
  selectedSubject: number | undefined;
  from: string | undefined;
  to: string | undefined;
  terms: Array<{ semester: number; academicYear: string }>;
  subjects: Array<{ id: number; name: string }>;
  status?: string;
};

export default function AttendanceFilters({
  selectedTerm,
  selectedSubject,
  from,
  to,
  terms,
  subjects,
  status,
}: AttendanceFiltersProps) {
  const router = useRouter();
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeError, setRangeError] = useState(false);

  function update(name: string, value: string) {
    const form = new FormData(document.getElementById("attendance-statistics-filters") as HTMLFormElement);
    form.set(name, value);
    const nextFrom = String(form.get("from") || "");
    const nextTo = String(form.get("to") || "");
    if (nextFrom && nextTo && nextFrom > nextTo) { setRangeError(true); return; }
    setRangeError(false);
    const params = new URLSearchParams();
    for (const [key, item] of form.entries()) if (item) params.set(key, String(item));
    params.delete("q"); params.delete("rate");
    router.replace(`/student/attendance/statistics${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form id="attendance-statistics-filters" className="statistics-toolbar" onSubmit={(event) => event.preventDefault()}>
      {status && <input type="hidden" name="status" value={status} />}
      <div className="statistics-filter-group term-date-group">
      <StatisticsDropdown name="term" label="ภาคเรียน" value={selectedTerm} icon={<CalendarDays aria-hidden="true" />} options={terms.length ? terms.map((term) => ({ value: `${term.semester}|${term.academicYear}`, label: `ภาคเรียนที่ ${term.semester}/${term.academicYear}` })) : [{ value: "", label: "ไม่มีข้อมูล" }]} onChange={(value) => update("term", value)} />

      <div className={`statistics-date-disclosure statistics-framed-field${rangeOpen ? " is-open" : ""}`} onKeyDown={(event) => { if (event.key === "Escape") setRangeOpen(false); }}>
        <small>ช่วงวันที่</small>
        <button type="button" className="statistics-range-toggle" aria-expanded={rangeOpen} aria-controls="statistics-date-options" onClick={() => setRangeOpen((open) => !open)}><CalendarDays aria-hidden="true" /><span>{from || to ? `${from ? from.split("-").reverse().join("/") : "ไม่จำกัด"} – ${to ? to.split("-").reverse().join("/") : "ไม่จำกัด"}` : "เลือกช่วงวันที่"}</span><ChevronDown aria-hidden="true" /></button>
        <div id="statistics-date-options" className="statistics-range-fields" hidden={!rangeOpen}>
          <label><small>จาก</small><DateTimeInput aria-label="จากวันที่" name="from" type="date" value={from || ""} onChange={(event) => update("from", event.target.value)} aria-invalid={rangeError} /></label>
          <label><small>ถึง</small><DateTimeInput aria-label="ถึงวันที่" name="to" type="date" value={to || ""} onChange={(event) => update("to", event.target.value)} aria-invalid={rangeError} /></label>
          {rangeError && <small className="statistics-date-error" role="alert">ช่วงวันที่ไม่ถูกต้อง</small>}
        </div>
      </div>
      </div>

      <div className="statistics-filter-group subject-reset-group">
      <StatisticsDropdown name="subject" label="รายวิชา" value={String(selectedSubject || "")} icon={<BookOpen aria-hidden="true" />} options={[{ value: "", label: "ทั้งหมด" }, ...subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))]} onChange={(value) => update("subject", value)} />

      <button type="button" className="statistics-clear-filter filter-reset-button" onClick={() => { setRangeOpen(false); setRangeError(false); router.replace("/student/attendance/statistics"); }}><RotateCcw aria-hidden="true" />รีเซ็ตตัวกรอง</button>
      </div>
    </form>
  );
}
