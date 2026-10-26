import { RotateCcw, Search } from "lucide-react";
import type { ClassroomOption } from "./types";

type Props = {
  query: string;
  classroomId: string;
  academicYear: string;
  academicYears: string[];
  semester: "1" | "2";
  classrooms: ClassroomOption[];
  onQueryChange: (value: string) => void;
  onClassroomChange: (value: string) => void;
  onAcademicYearChange: (value: string) => void;
  onSemesterChange: (value: "1" | "2") => void;
  onReset: () => void;
};

export function SubjectFilters({
  query,
  classroomId,
  academicYear,
  academicYears,
  semester,
  classrooms,
  onQueryChange,
  onClassroomChange,
  onAcademicYearChange,
  onSemesterChange,
  onReset,
}: Props) {
  const hasFilters = Boolean(query || classroomId);

  return (
    <div className="subjects-toolbar" aria-label="ตัวกรองรายวิชา">
      <label className="subjects-search">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="ค้นหารหัสวิชา ชื่อรายวิชา หรือครูผู้สอน"
          placeholder="ค้นหารหัสวิชา, ชื่อรายวิชา หรือครูผู้สอน..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>
      <select
        aria-label="กรองตามชั้นเรียน"
        value={classroomId}
        onChange={(event) => onClassroomChange(event.target.value)}
      >
        <option value="">ชั้นเรียนทั้งหมด</option>
        {classrooms.map((classroom) => (
          <option key={classroom.id} value={classroom.id}>
            {classroom.name}
          </option>
        ))}
      </select>
      <select
        aria-label="ปีการศึกษา"
        value={academicYear}
        onChange={(event) => onAcademicYearChange(event.target.value)}
      >
        {academicYears.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      <select
        aria-label="ภาคเรียน"
        value={semester}
        onChange={(event) => onSemesterChange(event.target.value as "1" | "2")}
      >
        <option value="1">ภาคเรียนที่ 1</option>
        <option value="2">ภาคเรียนที่ 2</option>
      </select>
      <button
        className="subjects-reset filter-reset-button"
        type="button"
        disabled={!hasFilters}
        onClick={onReset}
      >
        <RotateCcw size={15} aria-hidden="true" />
        ล้างตัวกรอง
      </button>
    </div>
  );
}
