"use client";
import type { ClassroomOption, SubjectFormValue, SubjectOption } from "./types";

export type SubjectErrors = Partial<Record<keyof SubjectFormValue, string>>;
type Props = {
  value: SubjectFormValue;
  teachers: SubjectOption[];
  classrooms: ClassroomOption[];
  errors: SubjectErrors;
  busy: boolean;
  onChange: (next: SubjectFormValue) => void;
  onSubmit: () => void;
  onCancel: () => void;
};
const DAYS = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];
export default function SubjectForm({
  value,
  teachers,
  classrooms,
  errors,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const set = <K extends keyof SubjectFormValue>(
    key: K,
    next: SubjectFormValue[K],
  ) => onChange({ ...value, [key]: next });
  const available = classrooms.filter(
    (room) => room.level === value.gradeLevel,
  );
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="subject-form"
    >
      <div className="subject-form-grid">
        <Field label="รหัสวิชา" required error={errors.subjectCode}>
          <input
            value={value.subjectCode}
            onChange={(e) => set("subjectCode", e.target.value)}
            placeholder="เช่น MATH501"
          />
        </Field>
        <Field label="ชื่อวิชา" required error={errors.subjectName}>
          <input
            value={value.subjectName}
            onChange={(e) => set("subjectName", e.target.value)}
            placeholder="เช่น คณิตศาสตร์พื้นฐาน"
          />
        </Field>
        <Field label="ครูผู้สอน" required error={errors.teacherId}>
          <select
            value={value.teacherId ?? ""}
            onChange={(e) => set("teacherId", Number(e.target.value) || null)}
          >
            <option value="">เลือกครูผู้สอน</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ระดับชั้น" required error={errors.gradeLevel}>
          <select
            value={value.gradeLevel}
            onChange={(e) =>
              onChange({ ...value, gradeLevel: e.target.value, classId: null })
            }
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>ม.{n}</option>
            ))}
          </select>
        </Field>
        <Field label="ชั้นเรียน" required error={errors.classId}>
          <select
            value={value.classId ?? ""}
            onChange={(e) => set("classId", Number(e.target.value) || null)}
          >
            <option value="">เลือกห้องเรียน</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ภาคเรียน" required error={errors.semester}>
          <select
            value={value.semester}
            onChange={(e) => set("semester", e.target.value as "1" | "2")}
          >
            <option value="1">ภาคเรียนที่ 1</option>
            <option value="2">ภาคเรียนที่ 2</option>
          </select>
        </Field>
        <Field label="ปีการศึกษา" required error={errors.academicYear}>
          <input
            value={value.academicYear}
            onChange={(e) => set("academicYear", e.target.value)}
          />
        </Field>
        <Field label="จำนวนหน่วยกิต" required error={errors.credits}>
          <div className="credit-input">
            <input
              type="number"
              min="0"
              step="0.5"
              value={value.credits}
              onChange={(e) => set("credits", e.target.value)}
            />
            <span>หน่วยกิต</span>
          </div>
        </Field>
        <div className="subject-field subject-wide">
          <span>
            วันและเวลาเรียน <b>*</b>
          </span>
          <div className="day-options">
            {DAYS.map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={value.studyDays.includes(day)}
                  onChange={(e) =>
                    set(
                      "studyDays",
                      e.target.checked
                        ? [...value.studyDays, day]
                        : value.studyDays.filter((d) => d !== day),
                    )
                  }
                />
                {day}
              </label>
            ))}
          </div>
          {errors.studyDays && <small>{errors.studyDays}</small>}
        </div>
        <Field label="เวลาเริ่มเรียน" required error={errors.startTime}>
          <input
            type="time"
            value={value.startTime}
            onChange={(e) => set("startTime", e.target.value)}
          />
        </Field>
        <Field label="เวลาเลิกเรียน" required error={errors.endTime}>
          <input
            type="time"
            value={value.endTime}
            onChange={(e) => set("endTime", e.target.value)}
          />
        </Field>
        <Field label="ห้องเรียน/สถานที่เรียน" error={errors.location} wide>
          <input
            value={value.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="เช่น ห้องคอมพิวเตอร์ 1 อาคาร 3"
          />
        </Field>
        <div className="subject-field">
          <span>การเช็คชื่อ</span>
          <div className="radio-options">
            <label>
              <input
                type="radio"
                checked={value.attendanceMode === "EVERY_PERIOD"}
                onChange={() => set("attendanceMode", "EVERY_PERIOD")}
              />{" "}
              เช็คทุกคาบ
            </label>
            <label>
              <input
                type="radio"
                checked={value.attendanceMode === "FIRST_PERIOD"}
                onChange={() => set("attendanceMode", "FIRST_PERIOD")}
              />{" "}
              เช็คเฉพาะคาบแรก
            </label>
          </div>
        </div>
        <div className="subject-field">
          <span>สถานะรายวิชา</span>
          <div className="status-inline">
            <button
              type="button"
              role="switch"
              aria-checked={value.isActive}
              className={`toggle ${value.isActive ? "on" : ""}`}
              onClick={() => set("isActive", !value.isActive)}
            >
              <i />
            </button>
            <span>{value.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
          </div>
        </div>
        <Field label="รายละเอียดเพิ่มเติม" error={errors.description} wide>
          <textarea
            maxLength={255}
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="รายละเอียดเกี่ยวกับรายวิชา (ถ้ามี)"
          />
          <em>{value.description.length}/255</em>
        </Field>
      </div>
      <div className="subject-modal-footer">
        <button
          type="button"
          className="admin-button secondary"
          onClick={onCancel}
          disabled={busy}
        >
          ยกเลิก
        </button>
        <button className="admin-button primary" disabled={busy}>
          {busy && <span className="button-spinner" />}
          {busy ? "กำลังบันทึก..." : "บันทึกรายวิชา"}
        </button>
      </div>
    </form>
  );
}
function Field({
  label,
  required,
  error,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`subject-field ${wide ? "subject-wide" : ""}`}>
      <span>
        {label} {required && <b>*</b>}
      </span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
