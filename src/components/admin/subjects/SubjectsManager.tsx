"use client";
import { useMemo, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import SubjectModal from "./SubjectModal";
import SubjectTable from "./SubjectTable";
import type { ClassroomOption, SubjectOption, SubjectRecord } from "./types";
import type { SubjectRequest } from "@/lib/subject-requests";
import { SubjectRequestsQueue } from "./SubjectRequestsQueue";
import { SubjectFilters } from "./SubjectFilters";
import { SubjectStats } from "./SubjectStats";
import { confirmDanger, showActionSuccess } from "@/lib/sweet-alert";
import { RippleButton } from "@/components/portal/RippleButton";
type Props = {
  initialSubjects: SubjectRecord[];
  initialRequests: SubjectRequest[];
  teachers: SubjectOption[];
  classrooms: ClassroomOption[];
  academicYear: string;
  semester: "1" | "2";
  academicYears: string[];
};
export default function SubjectsManager({
  initialSubjects,
  initialRequests,
  teachers,
  classrooms,
  academicYear,
  semester: initialSemester,
  academicYears,
}: Props) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [query, setQuery] = useState("");
  const [room, setRoom] = useState("");
  const [year, setYear] = useState(academicYear);
  const [semester, setSemester] = useState<"1" | "2">(initialSemester);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<SubjectRecord | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);
  const filtered = useMemo(
    () =>
      subjects.filter(
        (s) =>
          s.academicYear === year &&
          s.semester === semester &&
          (!query ||
            `${s.subjectCode} ${s.subjectName} ${s.teacherName}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!room || String(s.classId) === room),
      ),
    [subjects, query, room, year, semester],
  );
  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3000);
  }
  async function reload() {
    const response = await fetch(`/api/subjects?academicYear=${encodeURIComponent(year)}&semester=${semester}`, { cache: "no-store" });
    if (!response.ok) throw new Error("โหลดข้อมูลล่าสุดไม่สำเร็จ");
    const data = (await response.json()) as { subjects: SubjectRecord[] };
    setSubjects(data.subjects);
  }
  async function remove(subject: SubjectRecord) {
    const confirmed = await confirmDanger({
      title: "ลบรายวิชา?",
      text: `${subject.subjectCode} ${subject.subjectName} จะถูกนำออกจากระบบ`,
      confirmText: "ลบรายวิชา",
    });
    if (!confirmed) return;
    setBusyId(subject.databaseId);
    try {
      const response = await fetch(`/api/subjects?id=${subject.databaseId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "ลบไม่สำเร็จ");
      setSubjects((current) =>
        current.filter((s) => s.databaseId !== subject.databaseId),
      );
      void showActionSuccess(data.message || "ลบรายวิชาสำเร็จ");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }
  return (
    <main className="admin-content subjects-page">
      <div className="subjects-page-inner">
        <div className="page-intro subjects-page-intro">
          <div className="subjects-page-title">
            <BookOpen size={28} aria-hidden="true" />
            <div>
              <h1>รายวิชา</h1>
          <p>จัดการรายวิชา ครูผู้สอน และคำขอเปิดรายวิชาตามภาคเรียน</p>
            </div>
        </div>
        <RippleButton
          type="button"
          className="admin-button primary"
          onClick={() => {
            setEditing(null);
            setModal(true);
          }}
        >
          <Plus size={18} />
          เพิ่มรายวิชา
        </RippleButton>
      </div>
        <SubjectStats
          subjectCount={subjects.filter((subject) => subject.academicYear === year && subject.semester === semester).length}
          activeSubjectCount={subjects.filter((subject) => subject.academicYear === year && subject.semester === semester && subject.isActive).length}
          classroomCount={classrooms.length}
        />
        <SubjectRequestsQueue
          key={`${year}-${semester}`}
          initialRequests={initialRequests.filter((request) => request.academicYear === year && String(request.semester) === semester)}
          onApproved={() => {
            void reload().catch((error: unknown) =>
              notify(
                error instanceof Error ? error.message : "โหลดรายวิชาล่าสุดไม่สำเร็จ",
                "error",
              ),
            );
          }}
        />
        <section className="subjects-catalog">
          <div className="subjects-catalog-head">
            <div>
              <h2>รายวิชาที่เปิดสอน</h2>
              <p>รายวิชาและครูผู้สอนของภาคเรียนที่เลือก</p>
            </div>
            <span role="status" aria-live="polite" aria-atomic="true">{filtered.length.toLocaleString("th-TH")} รายวิชา</span>
          </div>
          <SubjectFilters
            query={query}
            classroomId={room}
            academicYear={year}
            academicYears={[...new Set([year, ...academicYears])].sort((a, b) => Number(b) - Number(a))}
            semester={semester}
            classrooms={classrooms}
            onQueryChange={setQuery}
            onClassroomChange={setRoom}
            onAcademicYearChange={setYear}
            onSemesterChange={setSemester}
            onReset={() => {
              setQuery("");
              setRoom("");
            }}
          />
          <SubjectTable
          key={`${query}:${room}:${year}:${semester}`}
            subjects={filtered}
            onEdit={(subject) => {
              setEditing(subject);
              setModal(true);
            }}
            onDelete={remove}
            busyId={busyId}
          />
        </section>
      </div>
      <SubjectModal
        open={modal}
        subject={editing}
        teachers={teachers}
        classrooms={classrooms}
        academicYear={year}
        semester={semester}
        onClose={() => setModal(false)}
        onSaved={reload}
        onToast={(message, tone) => {
          if (tone === "success") void showActionSuccess(message);
          else notify(message, tone);
        }}
      />
      {toast && (
        <div className={`subject-toast ${toast.tone}`}>{toast.message}</div>
      )}
    </main>
  );
}
