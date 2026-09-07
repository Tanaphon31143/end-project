"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import { Badge, PersonCell } from "@/components/admin/AdminPage";
import {
  EMPTY_STUDENT,
  type ClassroomOption,
  type StudentFormValue,
  type StudentRecord,
} from "./types";

type Mode = "create" | "view" | "edit";
type Errors = Partial<Record<keyof StudentFormValue, string>>;

export default function StudentsManager({
  initialStudents,
  classrooms,
}: {
  initialStudents: StudentRecord[];
  classrooms: ClassroomOption[];
}) {
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [room, setRoom] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [value, setValue] = useState<StudentFormValue>(EMPTY_STUDENT);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const levels = useMemo(
    () => [...new Set(classrooms.map((item) => item.level))],
    [classrooms],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return students.filter((student) => {
      const matchesQuery =
        !needle ||
        [
          student.studentCode,
          student.fullName,
          student.email,
          student.parentName,
          student.phone,
        ].some((item) => item.toLocaleLowerCase("th").includes(needle));
      return (
        matchesQuery &&
        (!level || student.classLevel === level) &&
        (!room || String(student.classId) === room)
      );
    });
  }, [students, query, level, room]);

  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3500);
  }

  function open(nextMode: Mode, student: StudentRecord | null = null) {
    setMode(nextMode);
    setSelected(student);
    setErrors({});
    setServerError("");
    setValue(
      student
        ? {
            studentCode: student.studentCode,
            fullName: student.fullName,
            email: student.email,
            password: "",
            classId: student.classId,
            classNumber: student.classNumber ? String(student.classNumber) : "",
            parentName: student.parentName,
            phone: student.phone,
            status: student.status,
          }
        : { ...EMPTY_STUDENT },
    );
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const studentId = Number(params.get("student"));
    const requestedMode = params.get("mode") === "edit" ? "edit" : "view";
    const student = initialStudents.find(
      (item) => item.databaseId === studentId,
    );
    if (student) queueMicrotask(() => open(requestedMode, student));
  }, [initialStudents]);

  function validate() {
    const next: Errors = {};
    if (!value.studentCode.trim()) next.studentCode = "กรุณากรอกรหัสนักเรียน";
    if (!value.fullName.trim()) next.fullName = "กรุณากรอกชื่อ-สกุล";
    if (!/^\S+@\S+\.\S+$/.test(value.email.trim()))
      next.email = "กรุณากรอกอีเมลให้ถูกต้อง";
    if (mode === "create" && value.password.length < 8)
      next.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    if (value.password.length > 128)
      next.password = "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร";
    if (!value.classId) next.classId = "กรุณาเลือกห้องเรียน";
    if (
      !/^\d+$/.test(value.classNumber) ||
      Number(value.classNumber) < 1 ||
      Number(value.classNumber) > 999
    )
      next.classNumber = "กรุณากรอกเลขที่ 1–999";
    if (value.phone && !/^[0-9+()\-\s]+$/.test(value.phone))
      next.phone = "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function reload() {
    const response = await fetch("/api/students", { cache: "no-store" });
    const data = (await response.json()) as {
      students?: StudentRecord[];
      message?: string;
    };
    if (!response.ok || !data.students)
      throw new Error(data.message || "โหลดข้อมูลล่าสุดไม่สำเร็จ");
    setStudents(data.students);
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    setServerError("");
    try {
      const response = await fetch("/api/students", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, id: selected?.databaseId }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message || "บันทึกข้อมูลไม่สำเร็จ");
      await reload();
      setMode(null);
      notify(data.message || "บันทึกข้อมูลสำเร็จ", "success");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function remove(student: StudentRecord) {
    if (
      !window.confirm(
        `ยืนยันการลบนักเรียน ${student.fullName}? ข้อมูลใบหน้าของนักเรียนจะถูกลบด้วย`,
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(`/api/students?id=${student.databaseId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "ลบนักเรียนไม่สำเร็จ");
      setStudents((current) =>
        current.filter((item) => item.databaseId !== student.databaseId),
      );
      notify(data.message || "ลบนักเรียนสำเร็จ", "success");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  const readOnly = mode === "view";
  return (
    <main className="admin-content">
      <div className="page-intro">
        <div>
          <h2>ทะเบียนนักเรียน</h2>
          <p>จัดการข้อมูล บัญชี และห้องเรียนของนักเรียน</p>
        </div>
        <button className="admin-button primary" onClick={() => open("create")}>
          <Plus size={18} />
          เพิ่มนักเรียน
        </button>
      </div>
      <div className="admin-filters">
        <label>
          <Search size={18} />
          <input
            aria-label="ค้นหานักเรียน"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหารหัส ชื่อ อีเมล ผู้ปกครอง หรือเบอร์โทร"
          />
        </label>
        <select
          aria-label="ระดับชั้น"
          value={level}
          onChange={(event) => {
            setLevel(event.target.value);
            setRoom("");
          }}
        >
          <option value="">ระดับชั้นทั้งหมด</option>
          {levels.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="ห้องเรียน"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
        >
          <option value="">ห้องเรียนทั้งหมด</option>
          {classrooms
            .filter((item) => !level || item.level === level)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        <button
          className="admin-button secondary"
          onClick={() => {
            setQuery("");
            setLevel("");
            setRoom("");
          }}
        >
          ล้างตัวกรอง
        </button>
      </div>
      <section className="dashboard-card admin-table-card">
        <div className="card-head">
          <div>
            <h2>รายชื่อนักเรียน</h2>
            <p>
              แสดง {filtered.length} จาก {students.length} คน
            </p>
          </div>
          <span className="row-count">ทั้งหมด {filtered.length} รายการ</span>
        </div>
        <div className="admin-data-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัสนักเรียน</th>
                <th>ชื่อ-สกุล</th>
                <th>ชั้น</th>
                <th>เลขที่</th>
                <th>ผู้ปกครอง</th>
                <th>เบอร์โทร</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.databaseId}>
                  <td>
                    <b>{student.studentCode}</b>
                  </td>
                  <td>
                    <PersonCell
                      initials={student.fullName
                        .replace("เด็กชาย", "")
                        .replace("เด็กหญิง", "")
                        .slice(0, 2)}
                      name={student.fullName}
                      detail={student.email}
                    />
                  </td>
                  <td>{student.className}</td>
                  <td>{student.classNumber || "-"}</td>
                  <td>{student.parentName || "-"}</td>
                  <td>{student.phone || "-"}</td>
                  <td>
                    <Badge tone={student.status === "ACTIVE" ? "green" : "red"}>
                      {student.status === "ACTIVE" ? "ใช้งาน" : "ระงับ"}
                    </Badge>
                  </td>
                  <td>
                    <div className="student-icon-actions">
                      <button
                        title="ดูรายละเอียด"
                        onClick={() => open("view", student)}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title="แก้ไข"
                        onClick={() => open("edit", student)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        title="ลบ"
                        className="danger"
                        disabled={busy}
                        onClick={() => remove(student)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="class-empty">
                    ไม่พบข้อมูลนักเรียน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mode && (
        <div
          className="student-modal-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setMode(null);
          }}
        >
          <section
            className="student-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
          >
            <header>
              <div>
                <h2 id="student-modal-title">
                  {mode === "create"
                    ? "เพิ่มนักเรียน"
                    : mode === "edit"
                      ? "แก้ไขข้อมูลนักเรียน"
                      : "รายละเอียดนักเรียน"}
                </h2>
                <p>
                  {selected
                    ? `${selected.studentCode} · ${selected.fullName}`
                    : "กรอกข้อมูลนักเรียนให้ครบถ้วน"}
                </p>
              </div>
              <button
                onClick={() => setMode(null)}
                disabled={busy}
                aria-label="ปิด"
              >
                <X size={19} />
              </button>
            </header>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!readOnly) void save();
              }}
            >
              <div className="student-form-grid">
                <Field label="รหัสนักเรียน" required error={errors.studentCode}>
                  <input
                    disabled={readOnly}
                    value={value.studentCode}
                    onChange={(event) =>
                      setValue({ ...value, studentCode: event.target.value })
                    }
                    placeholder="เช่น 66010001"
                  />
                </Field>
                <Field label="ชื่อ-สกุล" required error={errors.fullName}>
                  <input
                    disabled={readOnly}
                    value={value.fullName}
                    onChange={(event) =>
                      setValue({ ...value, fullName: event.target.value })
                    }
                    placeholder="เช่น เด็กชายสมชาย ใจดี"
                  />
                </Field>
                <Field
                  label="อีเมลสำหรับเข้าสู่ระบบ"
                  required
                  error={errors.email}
                >
                  <input
                    disabled={readOnly}
                    type="email"
                    value={value.email}
                    onChange={(event) =>
                      setValue({ ...value, email: event.target.value })
                    }
                    placeholder="student@school.ac.th"
                  />
                </Field>
                {!readOnly && (
                  <Field
                    label={
                      mode === "edit"
                        ? "รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)"
                        : "รหัสผ่าน"
                    }
                    required={mode === "create"}
                    error={errors.password}
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={value.password}
                      onChange={(event) =>
                        setValue({ ...value, password: event.target.value })
                      }
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                    />
                  </Field>
                )}
                <Field label="ห้องเรียน" required error={errors.classId}>
                  <select
                    disabled={readOnly}
                    value={value.classId || ""}
                    onChange={(event) =>
                      setValue({
                        ...value,
                        classId: Number(event.target.value) || null,
                      })
                    }
                  >
                    <option value="">เลือกห้องเรียน</option>
                    {classrooms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="เลขที่" required error={errors.classNumber}>
                  <input
                    disabled={readOnly}
                    type="number"
                    min="1"
                    max="999"
                    value={value.classNumber}
                    onChange={(event) =>
                      setValue({ ...value, classNumber: event.target.value })
                    }
                    placeholder="เช่น 1"
                  />
                </Field>
                <Field label="ชื่อผู้ปกครอง">
                  <input
                    disabled={readOnly}
                    value={value.parentName}
                    onChange={(event) =>
                      setValue({ ...value, parentName: event.target.value })
                    }
                    placeholder="ชื่อ-สกุลผู้ปกครอง"
                  />
                </Field>
                <Field label="เบอร์โทรศัพท์" error={errors.phone}>
                  <input
                    disabled={readOnly}
                    value={value.phone}
                    onChange={(event) =>
                      setValue({ ...value, phone: event.target.value })
                    }
                    placeholder="เช่น 08x-xxx-xxxx"
                  />
                </Field>
                <Field label="สถานะบัญชี" required>
                  <select
                    disabled={readOnly}
                    value={value.status}
                    onChange={(event) =>
                      setValue({
                        ...value,
                        status: event.target.value as "ACTIVE" | "INACTIVE",
                      })
                    }
                  >
                    <option value="ACTIVE">ใช้งาน</option>
                    <option value="INACTIVE">ระงับ</option>
                  </select>
                </Field>
                {serverError && (
                  <p className="student-form-error">{serverError}</p>
                )}
              </div>
              <footer>
                <button
                  type="button"
                  className="admin-button secondary"
                  onClick={() => setMode(null)}
                  disabled={busy}
                >
                  {readOnly ? "ปิด" : "ยกเลิก"}
                </button>
                {!readOnly && (
                  <button className="admin-button primary" disabled={busy}>
                    <Save size={16} />
                    {busy
                      ? "กำลังบันทึก..."
                      : mode === "edit"
                        ? "บันทึกการแก้ไข"
                        : "บันทึกนักเรียน"}
                  </button>
                )}
              </footer>
            </form>
          </section>
        </div>
      )}
      {toast && (
        <div className={`subject-toast ${toast.tone}`}>{toast.message}</div>
      )}
    </main>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label>
      {label}
      {required && <b> *</b>}
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
