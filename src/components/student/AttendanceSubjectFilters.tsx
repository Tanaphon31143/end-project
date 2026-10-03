"use client";

import { Search } from "lucide-react";
import { useRef } from "react";

type AttendanceSubjectFiltersProps = {
  term: string;
  from?: string;
  to?: string;
  subjectId?: number;
  query: string;
  rate: string;
};

export default function AttendanceSubjectFilters({
  term,
  from,
  to,
  subjectId,
  query,
  rate,
}: AttendanceSubjectFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} method="get" className="statistics-subject-search">
      {term && <input type="hidden" name="term" value={term} />}
      {from && <input type="hidden" name="from" value={from} />}
      {to && <input type="hidden" name="to" value={to} />}
      {subjectId && <input type="hidden" name="subject" value={subjectId} />}
      <Search aria-hidden="true" />
      <input name="q" defaultValue={query} placeholder="ค้นหารายวิชา..." aria-label="ค้นหารายวิชา" />
      <select
        name="rate"
        defaultValue={rate}
        aria-label="กรองตามอัตราการเข้าเรียน"
        onChange={() => formRef.current?.requestSubmit()}
      >
        <option value="">ทั้งหมด</option>
        <option value="excellent">90% ขึ้นไป</option>
        <option value="good">80–89%</option>
        <option value="watch">70–79%</option>
        <option value="low">ต่ำกว่า 70%</option>
      </select>
      <button type="submit">ค้นหา</button>
    </form>
  );
}
