import { RotateCcw, Search } from "lucide-react";
import type { ClassroomOption } from "./types";

type Props = {
  query: string;
  classroomId: string;
  semester: string;
  classrooms: ClassroomOption[];
  onQueryChange: (value: string) => void;
  onClassroomChange: (value: string) => void;
  onSemesterChange: (value: string) => void;
  onReset: () => void;
};

export function SubjectFilters({
  query,
  classroomId,
  semester,
  classrooms,
  onQueryChange,
  onClassroomChange,
  onSemesterChange,
  onReset,
}: Props) {
  const hasFilters = Boolean(query || classroomId || semester);

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
        aria-label="กรองตามภาคเรียน"
        value={semester}
        onChange={(event) => onSemesterChange(event.target.value)}
      >
        <option value="">ภาคเรียนทั้งหมด</option>
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
