"use client";

import { useMemo, useState } from "react";
import { Search, UserRound, X } from "lucide-react";
import type { ClassroomOption, StudentAccountOption } from "./types";

export default function StudentTermEnrollmentModal({
  academicYear,
  semester,
  classrooms,
  students,
  onClose,
  onSaved,
}: {
  academicYear: string;
  semester: "1" | "2";
  classrooms: ClassroomOption[];
  students: StudentAccountOption[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState<number | null>(null);
  const [classId, setClassId] = useState(0);
  const [classNumber, setClassNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = students.find((student) => student.databaseId === studentId) ?? null;
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return students
      .filter((student) => !needle || `${student.studentCode} ${student.fullName} ${student.email}`.toLocaleLowerCase("th").includes(needle))
      .slice(0, 8);
  }, [query, students]);

  async function save() {
    setError("");
    if (!studentId) return setError("กรุณาเลือกบัญชีนักเรียน");
    if (!classId) return setError("กรุณาเลือกห้องเรียน");
    if (!/^\d+$/.test(classNumber) || Number(classNumber) < 1 || Number(classNumber) > 999) return setError("เลขที่ต้องเป็นจำนวนเต็มระหว่าง 1–999");
    setBusy(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ENROLL_EXISTING", studentId, classId, classNumber: Number(classNumber), academicYear, semester }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "เพิ่มรายชื่อนักเรียนไม่สำเร็จ");
      await onSaved(data.message || "เพิ่มนักเรียนเข้าภาคเรียนสำเร็จ");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="student-modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="student-modal student-enrollment-modal" role="dialog" aria-modal="true" aria-labelledby="student-enrollment-title">
        <header>
          <div>
            <h2 id="student-enrollment-title">เพิ่มบัญชีนักเรียนเดิม</h2>
            <p>เทอม {semester}/{academicYear} · บัญชี อีเมล และข้อมูลใบหน้าจะใช้ชุดเดิม</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="ปิด"><X size={19} /></button>
        </header>
        <div className="student-enrollment-body">
          <label className="student-enrollment-search">
            <Search size={17} aria-hidden="true" />
            <input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setStudentId(null); }} placeholder="ค้นหารหัส ชื่อ หรืออีเมล" aria-label="ค้นหาบัญชีนักเรียน" />
          </label>
          <div className="student-enrollment-list" role="listbox" aria-label="บัญชีนักเรียนที่ยังไม่มีรายชื่อในเทอมนี้">
            {matches.map((student) => (
              <button type="button" role="option" aria-selected={studentId === student.databaseId} key={student.databaseId} className={studentId === student.databaseId ? "selected" : ""} onClick={() => setStudentId(student.databaseId)}>
                <span className="student-enrollment-avatar"><UserRound size={17} aria-hidden="true" /></span>
                <span><b>{student.fullName}</b><small>{student.studentCode} · {student.email}</small></span>
              </button>
            ))}
            {!matches.length && <p className="student-enrollment-empty">ไม่พบบัญชีที่ยังไม่มีรายชื่อในภาคเรียนนี้</p>}
          </div>
          {selected && selected.termHistory.length > 0 && (
            <p className="student-enrollment-history"><b>ประวัติเดิม:</b> {selected.termHistory.map((item) => `${item.semester}/${item.academicYear} ${item.className}`).join(" · ")}</p>
          )}
          <div className="student-form-grid">
            <label>ห้องเรียน *<select value={classId || ""} onChange={(event) => setClassId(Number(event.target.value) || 0)}><option value="">เลือกห้องเรียน</option>{classrooms.map((room) => <option key={room.id} value={room.id}>{room.level} · {room.name}</option>)}</select></label>
            <label>เลขที่ *<input type="number" min="1" max="999" value={classNumber} onChange={(event) => setClassNumber(event.target.value)} placeholder="เช่น 1" /></label>
          </div>
          {error && <p className="student-form-error">{error}</p>}
        </div>
        <footer>
          <button type="button" className="admin-button secondary" onClick={onClose} disabled={busy}>ยกเลิก</button>
          <button type="button" className="admin-button primary" onClick={() => void save()} disabled={busy || !students.length}>{busy ? "กำลังเพิ่มรายชื่อ..." : "เพิ่มเข้าภาคเรียน"}</button>
        </footer>
      </section>
    </div>
  );
}
