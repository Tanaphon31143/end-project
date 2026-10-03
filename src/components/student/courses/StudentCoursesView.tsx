"use client";

import React, { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import type { StudentCourse } from "@/lib/student-data";
import SubjectCard from "./SubjectCard";
import SubjectDetailModal from "./SubjectDetailModal";
import WeeklyTimetable from "./WeeklyTimetable";

interface StudentCoursesViewProps {
  courses: StudentCourse[];
}

export default function StudentCoursesView({
  courses,
}: StudentCoursesViewProps) {
  const [selectedCourse, setSelectedCourse] = useState<StudentCourse | null>(null);

  // The student shell owns the scroll container. Always open this route at
  // the beginning so a previously retained scroll position cannot hide the
  // page title underneath the persistent header.
  useEffect(() => {
    document.getElementById("student-main")?.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="mx-auto flex min-w-0 max-w-[1360px] flex-col gap-5 pb-12 print:max-w-none print:gap-4 print:pb-0">
      {/* Page Header */}
      <header className="print:hidden">
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-[-0.025em] text-slate-950 sm:text-[2rem]">
            รายวิชาของฉัน
          </h1>
          <p className="mt-1.5 text-base text-slate-600">
            รายวิชาที่กำลังเรียน และตารางเรียนประจำสัปดาห์
          </p>
        </div>
      </header>

      {/* Subject Cards Grid */}
      <section className="shrink-0 print:hidden">
        {courses.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course, index) => (
              <SubjectCard
                key={course.id}
                course={course}
                index={index}
                onSelect={setSelectedCourse}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="flex w-14 h-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 border border-blue-100">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              ยังไม่มีรายวิชาที่เปิดสอน
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              ไม่พบรายวิชาที่ลงทะเบียนในห้องเรียนของคุณ กรุณาติดต่อครูประจำชั้นหรือฝ่ายวิชาการ
            </p>
          </div>
        )}
      </section>

      {/* Weekly Timetable */}
      <WeeklyTimetable courses={courses} onSelectCourse={setSelectedCourse} />

      {/* Subject Detail Modal */}
      <SubjectDetailModal
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
}
