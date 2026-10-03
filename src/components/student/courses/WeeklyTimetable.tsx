"use client";

import React, { useMemo } from "react";
import {
  BookOpen,
  Calendar as CalendarIcon,
  Clock3,
  Printer,
  Utensils,
} from "lucide-react";
import type { StudentCourse, StudentCourseSchedule } from "@/lib/student-data";
import {
  getSubjectTheme,
  dayThemes,
  formatRoomName,
  WEEKDAYS,
} from "./course-theme";

interface WeeklyTimetableProps {
  courses: StudentCourse[];
  onSelectCourse: (course: StudentCourse) => void;
}

type TimetableSlot = {
  period: number;
  label: string;
  time: string;
  start: string;
  end: string;
  isLunch?: boolean;
};

// Standard Thai secondary school period structure
const MORNING_PERIODS: TimetableSlot[] = [
  { period: 1, label: "คาบ 1", time: "08:30–09:30", start: "08:30", end: "09:30" },
  { period: 2, label: "คาบ 2", time: "09:30–10:30", start: "09:30", end: "10:30" },
  { period: 3, label: "คาบ 3", time: "10:30–11:30", start: "10:30", end: "11:30" },
  { period: 4, label: "พักเที่ยง", time: "11:30–12:45", start: "11:30", end: "12:45", isLunch: true },
];

const AFTERNOON_PERIODS: TimetableSlot[] = [
  { period: 5, label: "คาบ 5", time: "12:45–13:30", start: "12:45", end: "13:30" },
  { period: 6, label: "คาบ 6", time: "13:30–14:20", start: "13:30", end: "14:20" },
  { period: 7, label: "คาบ 7", time: "14:20–15:30", start: "14:20", end: "15:30" },
];

const ALL_PERIODS = [...MORNING_PERIODS, ...AFTERNOON_PERIODS];
const STANDARD_CLASS_STARTS = new Set(
  ALL_PERIODS.filter((slot) => !slot.isLunch).map((slot) => slot.start),
);

type MatchedSlot = {
  course: StudentCourse;
  schedule?: StudentCourseSchedule;
};

export default function WeeklyTimetable({
  courses,
  onSelectCourse,
}: WeeklyTimetableProps) {
  const { matrix, totalScheduledPeriods } = useMemo(() => {
    const grid: Record<string, Record<string, MatchedSlot | null>> = {};
    let periodCount = 0;

    WEEKDAYS.forEach((day) => {
      grid[day] = {};
      ALL_PERIODS.forEach((slot) => {
        grid[day][slot.time] = null;
      });
    });

    const items: Array<{
      course: StudentCourse;
      day: string;
      startTime: string;
      endTime: string;
      schedule?: StudentCourseSchedule;
    }> = [];

    courses.forEach((course) => {
      if (course.schedules && course.schedules.length > 0) {
        course.schedules.forEach((sc) => {
          items.push({ course, day: sc.day, startTime: sc.startTime, endTime: sc.endTime, schedule: sc });
        });
      } else if (course.days && course.days.length > 0) {
        course.days.forEach((dayName) => {
          items.push({ course, day: dayName, startTime: course.startTime || "08:30", endTime: course.endTime || "09:30" });
        });
      }
    });

    WEEKDAYS.forEach((day) => {
      const dayItems = items.filter((item) => item.day === day);
      ALL_PERIODS.forEach((slot) => {
        if (slot.isLunch) {
          grid[day][slot.time] = null;
          return;
        }

        const exactMatch = dayItems.find((item) => item.startTime === slot.start);
        if (exactMatch) {
          grid[day][slot.time] = { course: exactMatch.course, schedule: exactMatch.schedule };
          periodCount++;
          return;
        }
        const overlapMatch = dayItems.find(
          (item) =>
            !STANDARD_CLASS_STARTS.has(item.startTime) &&
            item.startTime < slot.end &&
            item.endTime > slot.start,
        );
        if (overlapMatch) {
          grid[day][slot.time] = { course: overlapMatch.course, schedule: overlapMatch.schedule };
          periodCount++;
        }
      });
    });

    return { matrix: grid, totalScheduledPeriods: periodCount };
  }, [courses]);

  const handlePrint = () => window.print();

  const sampleCourse = courses[0];
  const semesterDisplay = sampleCourse?.semester || "–";
  const academicYearDisplay = sampleCourse?.academicYear || "–";
  const semesterLabel = `เทอม ${semesterDisplay}/${academicYearDisplay}`;
  const classNameDisplay =
    sampleCourse?.className && sampleCourse.className !== "ยังไม่ระบุ"
      ? sampleCourse.className
      : sampleCourse?.classLevel || "ยังไม่ระบุ";

  return (
    <section className="student-weekly-timetable min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm print:border-none print:shadow-none">
      <div className="student-timetable-header flex flex-col gap-4 border-b border-slate-200 bg-white lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                ตารางเรียนประจำสัปดาห์
              </h2>
              <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                {classNameDisplay}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              ตารางเรียนของนักเรียน · {courses.length} รายวิชา · {totalScheduledPeriods} คาบ/สัปดาห์
            </p>
          </div>
        </div>

        <div className="student-timetable-actions print:hidden flex flex-wrap items-center gap-2">
          <div
            className="student-timetable-term inline-flex min-h-10 min-w-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-800"
            aria-label={`ภาคเรียนปัจจุบัน ${semesterLabel}`}
          >
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span className="whitespace-nowrap">{semesterLabel}</span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="student-timetable-print-button inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์ตารางเรียน</span>
          </button>
        </div>
      </div>

      <div className="student-timetable-scroll max-w-full overflow-x-auto overflow-y-visible overscroll-x-contain">
        <table className="w-full min-w-[1100px] border-separate border-spacing-1.5 px-2 py-1.5">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-32 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-bold text-slate-700">
                วัน / เวลา
              </th>

              {ALL_PERIODS.map((slot) => (
                <th
                  key={slot.time}
                  className={`min-w-[132px] rounded-xl px-3 py-3 text-center ${slot.isLunch ? "student-timetable-lunch-header" : "bg-slate-50"}`}
                >
                  <div className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-700">
                    {slot.isLunch
                      ? <Utensils className="h-4 w-4" />
                      : <Clock3 className="h-4 w-4 text-blue-600" />}
                    <span>{slot.isLunch ? slot.label : slot.time}</span>
                  </div>
                  {slot.isLunch && (
                    <span className="student-timetable-lunch-time">{slot.time}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {WEEKDAYS.map((day, rowIndex) => {
              const dayTheme = dayThemes[day] || dayThemes["จันทร์"];
              return (
                <tr
                  key={day}
                  className={`border-b border-slate-100 last:border-b-0 ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                >
                  <td className="sticky left-0 z-10 px-2 py-1.5 text-center"
                    style={{ backgroundColor: rowIndex % 2 === 0 ? "#ffffff" : "rgba(248,250,252,0.5)" }}
                  >
                    <div
                      className={`inline-flex min-h-16 min-w-[96px] items-center justify-center rounded-xl border px-3 py-2 text-sm font-bold leading-5 ${dayTheme.bg}`}
                    >
                      {day}
                    </div>
                  </td>

                  {ALL_PERIODS.map((slot) => {
                    const match = matrix[day]?.[slot.time];
                    return (
                      <td key={slot.time} className="p-0.5 align-middle">
                        {slot.isLunch
                          ? <LunchCell />
                          : match?.course
                          ? <SubjectCell course={match.course} onSelect={onSelectCourse} />
                          : <EmptyCell />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="student-timetable-footer flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span>คลิกที่ช่องรายวิชาเพื่อดูรายละเอียดครูผู้สอน ห้องเรียน และสถิติการเช็คชื่อ</span>
        </div>
        <span className="shrink-0 text-sm text-slate-500">
          ภาคเรียนที่ {semesterDisplay}/{academicYearDisplay}
        </span>
      </div>
    </section>
  );
}

function SubjectCell({
  course,
  onSelect,
}: {
  course: StudentCourse;
  onSelect: (course: StudentCourse) => void;
}) {
  const theme = getSubjectTheme(course.name, course.code);
  const IconComp = theme.Icon;
  const displayRoom = formatRoomName(course.room, course.className);

  return (
    <button
      type="button"
      onClick={() => onSelect(course)}
      title={`${course.code} ${course.name}`}
      className={`student-timetable-subject-cell flex h-16 w-full flex-col justify-center rounded-xl border ${theme.cellBorder} ${theme.cellBg} text-left transition-all hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
    >
      {/* Top: Icon + name */}
      <div className="student-timetable-subject-title flex min-w-0 items-center">
        <div className={`student-timetable-subject-icon flex shrink-0 items-center justify-center rounded ${theme.cellIconBg}`}>
          <IconComp className="h-3 w-3 text-white" />
        </div>
        <span className={`min-w-0 truncate text-sm font-bold leading-5 ${theme.cellText}`}>
          {course.name}
        </span>
      </div>

      {/* Bottom: Room */}
      <div className={`student-timetable-subject-room truncate text-xs font-medium leading-4 ${theme.cellSubtext}`} title={displayRoom}>
        {displayRoom}
      </div>
    </button>
  );
}

function EmptyCell() {
  return (
    <div className="flex h-16 select-none items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-sm leading-5 text-slate-400">
      ว่าง
    </div>
  );
}

function LunchCell() {
  return (
    <div className="student-timetable-lunch-cell">
      <Utensils aria-hidden="true" />
      <strong>พักเที่ยง</strong>
      <span>รับประทานอาหาร</span>
    </div>
  );
}
