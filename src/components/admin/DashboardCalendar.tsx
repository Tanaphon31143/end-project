"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function DashboardCalendar({ activeDates }: { activeDates: string[] }) {
  const [today, setToday] = useState<Date | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setToday(new Date()));
  }, []);

  const calendar = useMemo(() => {
    const base = today || new Date(2026, 0, 1);
    const month = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    const firstDay = month.getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const previousDays = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
    return {
      month,
      cells: Array.from({ length: 42 }, (_, index) => {
        const day = index - firstDay + 1;
        if (day < 1) return { day: previousDays + day, muted: true };
        if (day > daysInMonth) return { day: day - daysInMonth, muted: true };
        return { day, muted: false };
      }),
    };
  }, [today, offset]);

  const monthLabel = calendar.month.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const currentDay = today && offset === 0 ? today.getDate() : -1;
  const activeDateSet = new Set(activeDates);

  return (
    <section className="dashboard-card calendar-card">
      <div className="dashboard-section-head">
        <div className="dashboard-section-title">
          <span className="section-icon amber"><CalendarDays size={18} /></span>
          <div><h2>ปฏิทินกิจกรรม</h2><p>ภาพรวมประจำเดือน</p></div>
        </div>
      </div>
      <div className="calendar-toolbar">
        <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => setOffset((value) => value - 1)}><ChevronLeft size={17} /></button>
        <strong>{monthLabel}</strong>
        <button type="button" aria-label="เดือนถัดไป" onClick={() => setOffset((value) => value + 1)}><ChevronRight size={17} /></button>
        <button type="button" className="calendar-today" onClick={() => setOffset(0)}>วันนี้</button>
      </div>
      <div className="calendar-grid calendar-weekdays">
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid calendar-days">
        {calendar.cells.map((cell, index) => {
          const cellDate = [
            calendar.month.getFullYear(),
            String(calendar.month.getMonth() + 1).padStart(2, "0"),
            String(cell.day).padStart(2, "0"),
          ].join("-");
          const active = !cell.muted && activeDateSet.has(cellDate);
          return (
            <span key={`${cell.day}-${index}`} className={`${cell.muted ? "muted" : ""} ${cell.day === currentDay && !cell.muted ? "today" : ""}`}>
              {cell.day}{active && <i />}
            </span>
          );
        })}
      </div>
    </section>
  );
}
