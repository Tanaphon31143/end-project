"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  DoorOpen,
  GraduationCap,
  Award,
  User,
  ArrowRight,
} from "lucide-react";
import type { StudentCourse } from "@/lib/student-data";
import { getSubjectTheme, formatRoomName } from "./course-theme";

interface SubjectDetailModalProps {
  course: StudentCourse | null;
  onClose: () => void;
}

export default function SubjectDetailModal({
  course,
  onClose,
}: SubjectDetailModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (course) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [course, onClose]);

  if (!course) return null;

  const theme = getSubjectTheme(course.name, course.code, 0);
  const IconComponent = theme.Icon;

  const displayClass =
    course.className && course.className !== "ยังไม่ระบุ"
      ? course.className
      : course.classLevel || "ยังไม่ระบุ";

  const displayRoom = formatRoomName(course.room, course.className);

  const displayDays = course.days && course.days.length
    ? course.days.join(", ")
    : "ตามตารางสอน";

  const displayTime =
    course.startTime && course.endTime && course.startTime !== "--:--"
      ? `${course.startTime} - ${course.endTime} น.`
      : "ตามตารางสอน";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-detail-title"
      className="course-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="course-modal relative w-full overflow-y-auto bg-white text-slate-800 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="course-modal-header flex items-start justify-between border-b border-slate-100">
          <div className="course-modal-heading flex items-center">
            <div
              className={`course-modal-icon flex shrink-0 items-center justify-center ${theme.cardIconBg}`}
            >
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div className="course-modal-copy min-w-0">
              <div className="course-modal-tags flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 font-mono border border-slate-200/60">
                  {course.code}
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>กำลังเรียน</span>
                </span>
              </div>
              <h2
                id="course-detail-title"
                className="course-modal-title font-bold text-slate-900"
              >
                {course.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="course-modal-close text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="course-modal-body">
          {/* Teacher Box */}
          <div className="course-modal-teacher flex items-center border border-slate-100 bg-slate-50">
            <div className="course-modal-teacher-icon flex shrink-0 items-center justify-center bg-blue-100 text-blue-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">ครูผู้สอน</p>
              <p className="text-sm font-bold text-slate-800">
                {course.teacher}
              </p>
            </div>
          </div>

          {/* Grid Info */}
          <div className="course-modal-facts grid grid-cols-2 sm:grid-cols-3">
            <div className="course-modal-fact">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <GraduationCap className="w-4 h-4 text-blue-500" />
                <span className="text-[11px] font-medium">ระดับชั้น/ห้อง</span>
              </div>
              <p className="text-xs font-bold text-slate-800">{displayClass}</p>
            </div>

            <div className="course-modal-fact">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <DoorOpen className="w-4 h-4 text-indigo-500" />
                <span className="text-[11px] font-medium">ห้องเรียน</span>
              </div>
              <p className="text-xs font-bold text-slate-800 truncate" title={displayRoom}>
                {displayRoom}
              </p>
            </div>

            <div className="course-modal-fact">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-[11px] font-medium">หน่วยกิต</span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                {course.credits} หน่วยกิต
              </p>
            </div>

            <div className="course-modal-fact">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Calendar className="w-4 h-4 text-rose-500" />
                <span className="text-[11px] font-medium">วันเรียน</span>
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">
                {displayDays}
              </p>
            </div>

            <div className="course-modal-fact">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-medium">เวลาเรียน</span>
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">
                {displayTime}
              </p>
            </div>

            <div className="course-modal-fact">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <BookOpen className="w-4 h-4 text-sky-500" />
                <span className="text-[11px] font-medium">ภาคเรียน</span>
              </div>
              <p className="text-xs font-bold text-slate-800">
                {course.semester ? `เทอม ${course.semester}` : "เทอม 1"}
                {course.academicYear ? `/${course.academicYear}` : "/–"}
              </p>
            </div>
          </div>

          {/* Schedules list if available */}
          {course.schedules && course.schedules.length > 0 && (
            <div className="course-modal-schedule">
              <p className="course-modal-section-title text-sm font-bold text-slate-800">
                คาบเรียนประจำสัปดาห์
              </p>
              <div className="course-modal-schedule-list">
                {course.schedules.map((sc, idx) => (
                  <div
                    key={idx}
                    className="course-modal-schedule-row flex items-center justify-between text-sm bg-white"
                  >
                    <span className="font-semibold text-slate-700">
                      วัน{sc.day} ({sc.periodName || "คาบเรียน"})
                    </span>
                    <span className="tabular-nums text-slate-500">
                      {sc.startTime} - {sc.endTime} น.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {course.description && (
            <div className="course-modal-description">
              <p className="course-modal-section-title text-sm font-bold text-slate-800">
                คำอธิบายรายวิชา
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {course.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="course-modal-footer flex items-center justify-between border-t border-slate-100 gap-3">
          <Link
            href={`/student/courses/${course.id}`}
            className="course-modal-primary-action inline-flex items-center gap-2 font-semibold text-white"
          >
            <span>ดูประวัติการเข้าเรียนและสถิติวิชานี้</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="course-modal-secondary-action font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
