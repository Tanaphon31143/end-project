"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Eye, KeyRound, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Badge, PersonCell } from "@/components/admin/AdminPage";
import {
  EMPTY_TEACHER,
  type TeacherFormValue,
  type TeacherRecord,
  type TeacherSubjectOption,
} from "./types";

type Mode = "create" | "view" | "edit" | "password";
type Errors = Partial<Record<keyof TeacherFormValue, string>>;

export default function TeachersManager({
  initialTeachers,
  initialSubjects,
}: {
  initialTeachers: TeacherRecord[];
  initialSubjects: TeacherSubjectOption[];
}) {
  const [teachers, setTeachers] = useState(initialTeachers),
    [subjects, setSubjects] = useState(initialSubjects),
    [query, setQuery] = useState(""),
    [department, setDepartment] = useState(""),
    [status, setStatus] = useState(""),
    [mode, setMode] = useState<Mode | null>(null),
    [selected, setSelected] = useState<TeacherRecord | null>(null),
    [value, setValue] = useState<TeacherFormValue>(EMPTY_TEACHER),
    [errors, setErrors] = useState<Errors>({}),
    [serverError, setServerError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<{
      message: string;
      tone: "success" | "error";
    } | null>(null);
  const departments = useMemo(
    () =>
      [
        ...new Set(
          teachers.map((teacher) => teacher.department).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b, "th")),
    [teachers],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return teachers.filter(
      (teacher) =>
        (!needle ||
          [
            teacher.teacherCode,
            teacher.fullName,
            teacher.email,
            teacher.department,
            teacher.phone,
            ...teacher.subjectNames,
          ].some((item) => item.toLocaleLowerCase("th").includes(needle))) &&
        (!department || teacher.department === department) &&
        (!status || teacher.status === status),
    );
  }, [teachers, query, department, status]);

  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3500);
  }
  function open(nextMode: Mode, teacher: TeacherRecord | null = null) {
    setMode(nextMode);
    setSelected(teacher);
    setErrors({});
    setServerError("");
    setValue(
      teacher
        ? {
            teacherCode: teacher.teacherCode,
            fullName: teacher.fullName,
            email: teacher.email,
            password: "",
            department: teacher.department,
            phone: teacher.phone,
            status: teacher.status,
            subjectIds: teacher.subjectIds,
          }
        : { ...EMPTY_TEACHER },
    );
  }
  function validate() {
    const next: Errors = {};
    if (mode === "password") {
      if (value.password.length < 8)
        next.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    } else {
      if (!value.teacherCode.trim()) next.teacherCode = "กรุณากรอกรหัสครู";
      if (!value.fullName.trim()) next.fullName = "กรุณากรอกชื่อ-สกุล";
      if (!/^\S+@\S+\.\S+$/.test(value.email.trim()))
        next.email = "กรุณากรอกอีเมลให้ถูกต้อง";
      if (!value.department.trim()) next.department = "กรุณาระบุกลุ่มสาระ";
      if (value.phone && !/^[0-9+()\-\s]+$/.test(value.phone))
        next.phone = "รูปแบบเบอร์โทรไม่ถูกต้อง";
      if (mode === "create" && value.password.length < 8)
        next.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
      if (value.password.length > 128)
        next.password = "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร";
    }
    setErrors(next);
    return !Object.keys(next).length;
  }
  async function reload() {
    const response = await fetch("/api/teachers", { cache: "no-store" }),
      data = (await response.json()) as {
        teachers?: TeacherRecord[];
        subjects?: TeacherSubjectOption[];
        message?: string;
      };
    if (!response.ok || !data.teachers || !data.subjects)
      throw new Error(data.message || "โหลดข้อมูลล่าสุดไม่สำเร็จ");
    setTeachers(data.teachers);
    setSubjects(data.subjects);
  }
  async function save() {
    if (!validate()) return;
    const reassigned = subjects.filter(
      (subject) =>
        value.subjectIds.includes(subject.id) &&
        subject.teacherId &&
        subject.teacherId !== selected?.databaseId,
    );
    if (
      reassigned.length &&
      !window.confirm(
        `มี ${reassigned.length} รายวิชาที่มีครูผู้สอนอยู่แล้ว ต้องการเปลี่ยนครูผู้สอนเป็น ${value.fullName.trim()} หรือไม่?`,
      )
    )
      return;
    setBusy(true);
    setServerError("");
    try {
      const response = await fetch("/api/teachers", {
          method:
            mode === "password" ? "PATCH" : mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...value, id: selected?.databaseId }),
        }),
        data = (await response.json()) as { message?: string };
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
  async function remove(teacher: TeacherRecord) {
    if (!window.confirm(`ยืนยันการลบข้อมูลครู ${teacher.fullName}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/teachers?id=${teacher.databaseId}`, {
          method: "DELETE",
        }),
        data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "ลบข้อมูลครูไม่สำเร็จ");
      setTeachers((current) =>
        current.filter((item) => item.databaseId !== teacher.databaseId),
      );
      notify(data.message || "ลบข้อมูลครูสำเร็จ", "success");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  function toggleSubject(id: number) {
    setValue((current) => ({
      ...current,
      subjectIds: current.subjectIds.includes(id)
        ? current.subjectIds.filter((item) => item !== id)
        : [...current.subjectIds, id],
    }));
  }

  const readOnly = mode === "view",
    passwordOnly = mode === "password";
  return (
    <main className="admin-content">
      <div className="page-intro">
        <div>
          <h2>ข้อมูลครู</h2>
          <p>จัดการข้อมูลบุคลากร บัญชี และภาระการสอน</p>
        </div>
        <button className="admin-button primary" onClick={() => open("create")}>
          <Plus size={18} />
          เพิ่มครู
        </button>
      </div>
      <div className="admin-filters">
        <label>
          <Search size={18} />
          <input
            aria-label="ค้นหาครู"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหารหัส ชื่อ อีเมล กลุ่มสาระ หรือรายวิชา"
          />
        </label>
        <select
          aria-label="กลุ่มสาระ"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="">ทุกกลุ่มสาระ</option>
          {departments.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="สถานะ"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">ทุกสถานะ</option>
          <option value="ACTIVE">ใช้งาน</option>
          <option value="INACTIVE">ระงับ</option>
        </select>
        <button
          className="admin-button secondary"
          onClick={() => {
            setQuery("");
            setDepartment("");
            setStatus("");
          }}
        >
          ล้างตัวกรอง
        </button>
      </div>
      <section className="dashboard-card admin-table-card">
        <div className="card-head">
          <div>
            <h2>รายชื่อครู</h2>
            <p>
              แสดง {filtered.length} จาก {teachers.length} คน
            </p>
          </div>
          <span className="row-count">ทั้งหมด {filtered.length} รายการ</span>
        </div>
        <div className="admin-data-wrap">
          <table>
            <thead>
              <tr>
                <th>รหัสครู</th>
                <th>ชื่อ-สกุล</th>
                <th>กลุ่มสาระ</th>
                <th>รายวิชาที่รับผิดชอบ</th>
                <th>ครูที่ปรึกษา</th>
                <th>เบอร์โทร</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((teacher) => (
                <tr key={teacher.databaseId}>
                  <td>
                    <b>{teacher.teacherCode}</b>
                  </td>
                  <td>
                    <PersonCell
                      initials={teacher.fullName.slice(0, 2)}
                      name={teacher.fullName}
                      detail={teacher.email}
                    />
                  </td>
                  <td>{teacher.department || "-"}</td>
                  <td>
                    <span
                      className="teacher-workload"
                      title={teacher.subjectNames.join(", ")}
                    >
                      {teacher.subjectNames.length
                        ? `${teacher.subjectNames.length} วิชา · ${teacher.subjectNames.slice(0, 2).join(", ")}`
                        : "ยังไม่มีรายวิชา"}
                    </span>
                  </td>
                  <td>{teacher.advisorRooms.join(", ") || "-"}</td>
                  <td>{teacher.phone || "-"}</td>
                  <td>
                    <Badge tone={teacher.status === "ACTIVE" ? "green" : "red"}>
                      {teacher.status === "ACTIVE" ? "ใช้งาน" : "ระงับ"}
                    </Badge>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => open("view", teacher)} title="ดู">
                        <Eye size={16} />
                        <span>ดู</span>
                      </button>
                      <button
                        onClick={() => open("edit", teacher)}
                        title="แก้ไข"
                      >
                        <Pencil size={16} />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        onClick={() => open("password", teacher)}
                        title="เปลี่ยนรหัสผ่าน"
                      >
                        <KeyRound size={16} />
                        <span>เปลี่ยนรหัสผ่าน</span>
                      </button>
                      <button
                        className="danger"
                        disabled={busy}
                        onClick={() => remove(teacher)}
                        title="ลบ"
                      >
                        <Trash2 size={16} />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="subject-empty">
                      <span>ไม่พบข้อมูลครู</span>
                      <p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {mode && (
        <div
          className="subject-modal-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setMode(null);
          }}
        >
          <section
            className="subject-modal teacher-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-modal-title"
          >
            <header>
              <div>
                <h2 id="teacher-modal-title">
                  {mode === "create"
                    ? "เพิ่มครู"
                    : mode === "edit"
                      ? "แก้ไขข้อมูลครู"
                      : mode === "password"
                        ? "เปลี่ยนรหัสผ่าน"
                        : "รายละเอียดครู"}
                </h2>
                <p>
                  {selected
                    ? `${selected.teacherCode} · ${selected.fullName}`
                    : "สร้างบัญชีครูและกำหนดภาระการสอน"}
                </p>
              </div>
              <button
                onClick={() => setMode(null)}
                disabled={busy}
                aria-label="ปิด"
              >
                <X size={18} />
              </button>
            </header>
            <form
              className="subject-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!readOnly) void save();
              }}
            >
              {passwordOnly ? (
                <div className="subject-form-grid">
                  <Field
                    label="รหัสผ่านใหม่"
                    required
                    error={errors.password}
                    wide
                  >
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={value.password}
                      onChange={(event) =>
                        setValue({ ...value, password: event.target.value })
                      }
                      placeholder="อย่างน้อย 8 ตัวอักษร"
                      autoFocus
                    />
                  </Field>
                  {serverError && (
                    <p className="teacher-form-error">{serverError}</p>
                  )}
                </div>
              ) : (
                <div className="subject-form-grid">
                  <Field label="รหัสครู" required error={errors.teacherCode}>
                    <input
                      disabled={readOnly}
                      value={value.teacherCode}
                      onChange={(event) =>
                        setValue({ ...value, teacherCode: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="ชื่อ-สกุล" required error={errors.fullName}>
                    <input
                      disabled={readOnly}
                      value={value.fullName}
                      onChange={(event) =>
                        setValue({ ...value, fullName: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="อีเมล" required error={errors.email}>
                    <input
                      disabled={readOnly}
                      type="email"
                      value={value.email}
                      onChange={(event) =>
                        setValue({ ...value, email: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="กลุ่มสาระ" required error={errors.department}>
                    <input
                      disabled={readOnly}
                      list="teacher-departments"
                      value={value.department}
                      onChange={(event) =>
                        setValue({ ...value, department: event.target.value })
                      }
                    />
                    <datalist id="teacher-departments">
                      {departments.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="เบอร์โทรศัพท์" error={errors.phone}>
                    <input
                      disabled={readOnly}
                      value={value.phone}
                      onChange={(event) =>
                        setValue({ ...value, phone: event.target.value })
                      }
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
                  {mode === "create" && (
                    <Field label="รหัสผ่าน" required error={errors.password}>
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
                  <div className="subject-field subject-wide">
                    <span>รายวิชาที่รับผิดชอบ</span>
                    <div className="teacher-subject-list">
                      {subjects.length ? (
                        subjects.map((subject) => (
                          <label
                            key={subject.id}
                            className={
                              value.subjectIds.includes(subject.id)
                                ? "selected"
                                : ""
                            }
                          >
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={value.subjectIds.includes(subject.id)}
                              onChange={() => toggleSubject(subject.id)}
                            />
                            <span>
                              <b>{subject.code}</b> {subject.name}
                              <small>
                                {subject.teacherId &&
                                subject.teacherId !== selected?.databaseId
                                  ? `ปัจจุบัน: ${subject.teacherName}`
                                  : ""}
                              </small>
                            </span>
                          </label>
                        ))
                      ) : (
                        <p>ยังไม่มีรายวิชาในระบบ</p>
                      )}
                    </div>
                  </div>
                  {selected?.advisorRooms.length ? (
                    <div className="teacher-advisor-note subject-wide">
                      ครูที่ปรึกษาห้อง:{" "}
                      <b>{selected.advisorRooms.join(", ")}</b>
                    </div>
                  ) : null}
                  {serverError && (
                    <p className="teacher-form-error">{serverError}</p>
                  )}
                </div>
              )}
              <div className="subject-modal-footer">
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
                    {busy && <span className="button-spinner" />}
                    {busy ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                )}
              </div>
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
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`subject-field ${wide ? "subject-wide" : ""}`}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
