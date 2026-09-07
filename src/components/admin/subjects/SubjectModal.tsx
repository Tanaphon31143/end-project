"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import SubjectForm, { type SubjectErrors } from "./SubjectForm";
import {
  EMPTY_SUBJECT,
  type ClassroomOption,
  type SubjectFormValue,
  type SubjectOption,
  type SubjectRecord,
} from "./types";

type Props = {
  open: boolean;
  subject: SubjectRecord | null;
  teachers: SubjectOption[];
  classrooms: ClassroomOption[];
  academicYear: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onToast: (message: string, tone: "success" | "error") => void;
};
const SUBJECT_CODE_PATTERN = /^(?:[A-Za-z0-9]|\p{Script=Thai})+$/u;
export default function SubjectModal({
  open,
  subject,
  teachers,
  classrooms,
  academicYear,
  onClose,
  onSaved,
  onToast,
}: Props) {
  const [value, setValue] = useState<SubjectFormValue>({
    ...EMPTY_SUBJECT,
    academicYear,
  });
  const [errors, setErrors] = useState<SubjectErrors>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      queueMicrotask(() => {
        setErrors({});
        setValue(
          subject
            ? {
                subjectCode: subject.subjectCode,
                subjectName: subject.subjectName,
                teacherId: subject.teacherId,
                gradeLevel: subject.gradeLevel || "ม.5",
                classId: subject.classId,
                semester: subject.semester,
                academicYear: subject.academicYear,
                credits: subject.credits,
                studyDays: subject.studyDays,
                startTime: subject.startTime || "08:30",
                endTime: subject.endTime || "09:20",
                location: subject.location,
                attendanceMode: subject.attendanceMode,
                isActive: subject.isActive,
                description: subject.description,
              }
            : { ...EMPTY_SUBJECT, academicYear },
        );
      });
    }
  }, [open, subject, academicYear]);
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = "";
    };
  }, [open, busy, onClose]);
  if (!open) return null;
  function validate() {
    const next: SubjectErrors = {};
    if (!value.subjectCode.trim()) next.subjectCode = "กรุณากรอกรหัสวิชา";
    else if (!SUBJECT_CODE_PATTERN.test(value.subjectCode.trim()))
      next.subjectCode = "ใช้เฉพาะตัวอักษรไทย อังกฤษ และตัวเลข";
    if (!value.subjectName.trim()) next.subjectName = "กรุณากรอกชื่อวิชา";
    if (!value.teacherId) next.teacherId = "กรุณาเลือกครู";
    if (!value.classId) next.classId = "กรุณาเลือกห้องเรียน";
    if (!value.studyDays.length) next.studyDays = "กรุณาเลือกอย่างน้อย 1 วัน";
    if (!value.startTime) next.startTime = "กรุณาระบุเวลา";
    if (!value.endTime || value.endTime <= value.startTime)
      next.endTime = "เวลาเลิกต้องมากกว่าเวลาเริ่ม";
    if (
      Number(value.credits) < 0 ||
      Math.round(Number(value.credits) * 2) !== Number(value.credits) * 2
    )
      next.credits = "ต้องเป็นช่วงละ 0.5";
    setErrors(next);
    return !Object.keys(next).length;
  }
  async function submit() {
    if (!validate()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/subjects", {
        method: subject ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...value,
          subjectCode: value.subjectCode.trim(),
          subjectName: value.subjectName.trim(),
          id: subject?.databaseId,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "บันทึกไม่สำเร็จ");
      await onSaved();
      onToast(data.message || "บันทึกรายวิชาสำเร็จ", "success");
      onClose();
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="subject-modal-layer"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="subject-modal-title"
        className="subject-modal"
      >
        <header>
          <div>
            <h2 id="subject-modal-title">
              {subject ? "แก้ไขรายวิชา" : "เพิ่มรายวิชา"}
            </h2>
            <p>
              {subject
                ? "ปรับปรุงข้อมูลรายวิชาและตารางเรียน"
                : "กรอกข้อมูลรายวิชาใหม่เข้าระบบ"}
            </p>
          </div>
          <button aria-label="ปิด" onClick={onClose} disabled={busy}>
            <X size={18} />
          </button>
        </header>
        <SubjectForm
          value={value}
          teachers={teachers}
          classrooms={classrooms}
          errors={errors}
          busy={busy}
          onChange={setValue}
          onSubmit={submit}
          onCancel={onClose}
        />
      </section>
    </div>
  );
}
