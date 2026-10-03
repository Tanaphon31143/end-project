"use client";

import { BookOpen, CalendarDays, ChevronDown, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
  const [rangeOpen, setRangeOpen] = useState(Boolean(from || to));
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
      <label>
        <CalendarDays aria-hidden="true" />
        <span>
          <small>ภาคเรียน</small>
          <select name="term" value={selectedTerm} onChange={(event) => update("term", event.target.value)}>
            {!terms.length && <option value="">ไม่มีข้อมูล</option>}
            {terms.map((term) => (
              <option key={`${term.semester}-${term.academicYear}`} value={`${term.semester}|${term.academicYear}`}>
                ภาคเรียนที่ {term.semester}/{term.academicYear}
              </option>
            ))}
          </select>
        </span>
        <ChevronDown aria-hidden="true" />
      </label>

      <div className={`statistics-date-disclosure${rangeOpen ? " is-open" : ""}`}>
        <button type="button" className="statistics-range-toggle" aria-expanded={rangeOpen} onClick={() => setRangeOpen((open) => !open)}><CalendarDays aria-hidden="true" />{rangeOpen ? "ซ่อนช่วงวันที่" : "กำหนดช่วงวันที่"}</button>
        <div className="statistics-range-fields">
          <label><small>จาก</small><input aria-label="จากวันที่" name="from" type="date" value={from || ""} onChange={(event) => update("from", event.target.value)} aria-invalid={rangeError} /></label>
          <label><small>ถึง</small><input aria-label="ถึงวันที่" name="to" type="date" value={to || ""} onChange={(event) => update("to", event.target.value)} aria-invalid={rangeError} /></label>
          {rangeError && <small className="statistics-date-error" role="alert">ช่วงวันที่ไม่ถูกต้อง</small>}
        </div>
      </div>

      <label>
        <BookOpen aria-hidden="true" />
        <span>
          <small>รายวิชา</small>
          <select name="subject" value={selectedSubject || ""} onChange={(event) => update("subject", event.target.value)}>
            <option value="">ทั้งหมด</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
        </span>
        <ChevronDown aria-hidden="true" />
      </label>

      {(selectedSubject || from || to || status) && <button type="button" className="statistics-clear-filter" onClick={() => router.replace("/student/attendance/statistics")}><RotateCcw aria-hidden="true" />ล้างตัวกรอง</button>}
    </form>
  );
}
