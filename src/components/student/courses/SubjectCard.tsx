"use client";

import React from "react";
import { DoorOpen, User, ChevronRight } from "lucide-react";
import type { StudentCourse } from "@/lib/student-data";
import { getSubjectTheme, formatRoomName } from "./course-theme";

interface SubjectCardProps {
  course: StudentCourse;
  index: number;
  onSelect: (course: StudentCourse) => void;
}

export default function SubjectCard({
  course,
  index,
  onSelect,
}: SubjectCardProps) {
  const theme = getSubjectTheme(course.name, course.code, index);
  const IconComponent = theme.Icon;

  const displayClass =
    course.className && course.className !== "ยังไม่ระบุ"
      ? course.className
      : course.classLevel || "ยังไม่ระบุ";

  const displayRoom = formatRoomName(course.room, course.className);

  return (
    <article className="student-course-card group relative flex h-full min-h-[238px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="student-course-card-body flex min-w-0 flex-1 flex-col gap-4">
        {/* Row 1: Icon + Title + Badges */}
        <div className="student-course-card-heading flex items-start gap-3">
          {/* Subject icon */}
          <div
            className={`student-course-card-icon flex shrink-0 items-center justify-center shadow-sm ${theme.cardIconBg}`}
          >
            <IconComponent className="w-6 h-6 text-white" />
          </div>

          {/* Title + Code + Status stacked vertically */}
          <div className="flex-1 min-w-0">
            {/* Code + Status on one line */}
            <div className="student-course-card-badges mb-1.5 flex flex-wrap items-center gap-2">
              <span className={`student-course-code rounded-md border text-xs font-bold ${theme.pillBg} ${theme.pillBorder} ${theme.pillText}`}>
                {course.code}
              </span>
              <span className="student-course-status inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                กำลังเรียน
              </span>
            </div>
            {/* Course name */}
            <h3
              className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600"
              title={course.name}
            >
              {course.name}
            </h3>
          </div>
        </div>

        {/* Row 2: Teacher */}
        <div className="student-course-teacher flex min-w-0 items-center text-sm text-slate-600">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="shrink-0 text-sm text-slate-500">ครูผู้สอน:</span>
          <span className="truncate text-sm font-semibold text-slate-700">
            {course.teacher}
          </span>
        </div>

        {/* Row 3: Class + Room */}
        <div className="student-course-facts mt-auto grid grid-cols-2 divide-x divide-slate-200 rounded-xl border border-slate-100 bg-slate-50">
          {/* Class */}
          <div className="student-course-fact flex min-w-0 items-center">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
              <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-xs font-medium leading-4 text-slate-500">ระดับชั้น</p>
              <p className="truncate text-sm font-bold leading-5 text-slate-800">{displayClass}</p>
            </div>
          </div>

          {/* Room */}
          <div className="student-course-fact flex min-w-0 items-center">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50">
              <DoorOpen className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-xs font-medium leading-4 text-slate-500">ห้องเรียน</p>
              <p className="truncate text-sm font-bold leading-5 text-slate-800" title={displayRoom}>
                {displayRoom}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="student-course-card-footer mt-4">
        <button
          type="button"
          onClick={() => onSelect(course)}
          className="student-course-detail-button inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-600 hover:bg-blue-50 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span>ดูรายละเอียดวิชา</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
