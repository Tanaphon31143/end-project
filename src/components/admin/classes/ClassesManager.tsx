"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import type {
  Classroom,
  ClassroomValue,
  ClassStudent,
  TeacherOption,
} from "./types";
type Props = {
  initialClasses: Classroom[];
  initialStudents: Record<number, ClassStudent[]>;
  teachers: TeacherOption[];
  academicYear: string;
  semester: "1" | "2";
};
type MenuPosition = {
  top?: number;
  bottom?: number;
  right: number;
};
export default function ClassesManager({
  initialClasses,
  initialStudents,
  teachers,
  academicYear,
  semester,
}: Props) {
  const router = useRouter();
  const [classes, setClasses] = useState(initialClasses),
    [students, setStudents] = useState(initialStudents),
    [selected, setSelected] = useState(initialClasses[0]?.id || 0),
    [modal, setModal] = useState(false),
    [editing, setEditing] = useState<Classroom | null>(null),
    [menu, setMenu] = useState<number | null>(null),
    [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null),
    [page, setPage] = useState(1),
    [toast, setToast] = useState("");
  const [value, setValue] = useState<ClassroomValue>({
      className: "",
      gradeLevel: "ม.5",
      roomNumber: "1",
      advisorTeacherId: null,
      academicYear,
      semester,
      isActive: true,
      note: "",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (menu === null) return;
    const closeMenu = () => {
      setMenu(null);
      setMenuPosition(null);
    };
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menu]);
  const active = classes.find((c) => c.id === selected);
  const roomStudents = students[selected] || [],
    size = 5,
    totalPages = Math.max(1, Math.ceil(roomStudents.length / size)),
    shown = roomStudents.slice((page - 1) * size, page * size);
  function notify(m: string) {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  }
  function open(c?: Classroom) {
    setEditing(c || null);
    setError("");
    setValue(
      c
        ? {
            className: c.name,
            gradeLevel: c.level,
            roomNumber: c.roomNumber,
            advisorTeacherId: c.advisorTeacherId,
            academicYear: c.academicYear,
            semester: c.semester,
            isActive: c.isActive,
            note: c.note,
          }
        : {
            className: "",
            gradeLevel: "ม.5",
            roomNumber: "1",
            advisorTeacherId: null,
            academicYear,
            semester,
            isActive: true,
            note: "",
          },
    );
    setModal(true);
  }
  async function reload() {
    const r = await fetch("/api/classes", { cache: "no-store" }),
      d = await r.json();
    setClasses(d.classrooms);
    setStudents(d.studentsByClass);
    if (!selected && d.classrooms[0]) setSelected(d.classrooms[0].id);
  }
  async function removeStudent(student: ClassStudent) {
    if (!window.confirm(`ยืนยันการลบนักเรียน ${student.name}? ข้อมูลใบหน้าจะถูกลบด้วย`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/students?id=${student.id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "ลบนักเรียนไม่สำเร็จ");
      setStudents((current) => ({
        ...current,
        [selected]: (current[selected] || []).filter((item) => item.id !== student.id),
      }));
      setClasses((current) => current.map((item) => item.id === selected ? { ...item, studentCount: Math.max(0, item.studentCount - 1) } : item));
      notify(data.message || "ลบนักเรียนสำเร็จ");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด");
      notify(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!value.className.trim()) {
      setError("กรุณากรอกชื่อห้องเรียน");
      return;
    }
    if (!value.advisorTeacherId) {
      setError("กรุณาเลือกครูที่ปรึกษา");
      return;
    }
    setBusy(true);
    const r = await fetch("/api/classes", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, id: editing?.id }),
      }),
      d = await r.json();
    setBusy(false);
    if (!r.ok) {
      setError(d.message);
      return;
    }
    await reload();
    setModal(false);
    notify(d.message);
  }
  async function remove(c: Classroom) {
    setMenu(null);
    if (!confirm(`คุณต้องการลบห้อง ${c.name} หรือไม่?`)) return;
    const r = await fetch(`/api/classes?id=${c.id}`, { method: "DELETE" }),
      d = await r.json();
    notify(d.message);
    if (r.ok) await reload();
  }
  return (
    <main className="admin-content">
      <div className="page-intro">
        <div>
          <h2>ห้องเรียนทั้งหมด</h2>
          <p>ทั้งหมด {classes.length} ห้องเรียน</p>
        </div>
        <button className="admin-button primary" onClick={() => open()}>
          <Plus size={18} />
          เพิ่มห้องเรียน
        </button>
      </div>
      <section className="classroom-grid">
        {classes.map((c, i) => (
          <article
            key={c.id}
            className={`dashboard-card classroom-card ${selected === c.id ? "selected" : ""} ${menu === c.id ? "menu-open" : ""}`}
            onClick={() => {
              setSelected(c.id);
              setPage(1);
            }}
          >
            <div
              className={`class-icon ${["blue", "green", "purple", "orange"][i % 4]}`}
            >
              <UsersRound size={21} />
            </div>
            <div className="classroom-title">
              <h3>{c.name}</h3>
              <p>นักเรียน {c.studentCount} คน</p>
            </div>
            <div className="classroom-details">
              <span>ครูที่ปรึกษา</span>
              <b>{c.advisorName}</b>
              <p>ปีการศึกษา {c.academicYear}</p>
              <em>เปิดใช้งาน</em>
            </div>
            <div className="classroom-actions">
              <button
                className="admin-button secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(c.id);
                }}
              >
                ดูนักเรียน
              </button>
              <div>
                <button
                  aria-label="เมนูห้องเรียน"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menu === c.id) {
                      setMenu(null);
                      setMenuPosition(null);
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const menuHeight = 150;
                    setMenuPosition({
                      ...(window.innerHeight - rect.bottom >= menuHeight + 8
                        ? { top: rect.bottom + 4 }
                        : { bottom: window.innerHeight - rect.top + 4 }),
                      right: Math.max(12, window.innerWidth - rect.right),
                    });
                    setMenu(c.id);
                  }}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
      {menu !== null && menuPosition &&
        createPortal(
          <>
            <div
              className="classroom-menu-backdrop"
              aria-hidden="true"
              onMouseDown={() => {
                setMenu(null);
                setMenuPosition(null);
              }}
            />
            <aside
              className="classroom-context-menu"
              aria-label="การจัดการห้องเรียน"
              style={menuPosition}
            >
              <button
                onClick={() => {
                  setSelected(menu);
                  setMenu(null);
                  setMenuPosition(null);
                }}
              >
                <Eye size={15} />
                ดูรายละเอียด
              </button>
              <button
                onClick={() => {
                  const classroom = classes.find((c) => c.id === menu);
                  setMenu(null);
                  setMenuPosition(null);
                  if (classroom) open(classroom);
                }}
              >
                <Pencil size={15} />
                แก้ไขห้องเรียน
              </button>
              <button
                onClick={() => {
                  setSelected(menu);
                  setMenu(null);
                  setMenuPosition(null);
                }}
              >
                <UsersRound size={15} />
                จัดการนักเรียน
              </button>
              <button
                className="danger"
                onClick={() => {
                  const classroom = classes.find((c) => c.id === menu);
                  if (classroom) void remove(classroom);
                }}
              >
                <Trash2 size={15} />
                ลบห้องเรียน
              </button>
            </aside>
          </>,
          document.body,
        )}
      {active && (
        <section className="dashboard-card class-student-table">
          <div className="card-head">
            <div>
              <h2>นักเรียนห้อง {active.name}</h2>
              <p>จำนวนนักเรียน {roomStudents.length} คน</p>
            </div>
          </div>
          <div className="admin-data-wrap">
            <table>
              <thead>
                <tr>
                  <th>เลขที่</th>
                  <th>รหัสนักเรียน</th>
                  <th>ชื่อ-สกุล</th>
                  <th>เพศ</th>
                  <th>สถานะ</th>
                  <th>ข้อมูลใบหน้า</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td>{s.number || "-"}</td>
                    <td>{s.code}</td>
                    <td>
                      <div className="class-student-name">
                        <span>{s.name.slice(0, 1)}</span>
                        <b>{s.name}</b>
                      </div>
                    </td>
                    <td>
                      <i
                        className={`class-badge ${s.gender === "หญิง" ? "pink" : "blue"}`}
                      >
                        {s.gender}
                      </i>
                    </td>
                    <td>
                      <i className="class-badge green">{s.status}</i>
                    </td>
                    <td>
                      <i
                        className={`class-badge ${s.faceRegistered ? "green" : "orange"}`}
                      >
                        {s.faceRegistered ? "ลงทะเบียนแล้ว" : "ยังไม่ลงทะเบียน"}
                      </i>
                    </td>
                    <td>
                      <div className="student-icon-actions">
                        <button title="ดูรายละเอียด" onClick={() => router.push(`/admin/students?student=${s.id}&mode=view`)}>
                          <Eye size={15} />
                        </button>
                        <button title="แก้ไข" onClick={() => router.push(`/admin/students?student=${s.id}&mode=edit`)}>
                          <Pencil size={15} />
                        </button>
                        <button title="ลบ" className="danger" disabled={busy} onClick={() => void removeStudent(s)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!shown.length && (
                  <tr>
                    <td colSpan={7} className="class-empty">
                      ยังไม่มีนักเรียนในห้องนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="class-pagination">
            <span>
              แสดง {roomStudents.length ? (page - 1) * size + 1 : 0} -{" "}
              {Math.min(page * size, roomStudents.length)} จาก{" "}
              {roomStudents.length} คน
            </span>
            <select value={size} disabled>
              <option>5 / หน้า</option>
            </select>
            <div>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 8)
                .map((n) => (
                  <button
                    className={page === n ? "active" : ""}
                    key={n}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </footer>
        </section>
      )}
      {modal && (
        <div
          className="class-modal-layer"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <section className="class-modal">
            <header>
              <div>
                <h2>{editing ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"}</h2>
                <p>
                  {editing
                    ? "แก้ไขข้อมูลห้องเรียน"
                    : "กรอกข้อมูลห้องเรียนให้ครบถ้วน"}
                </p>
              </div>
              <button onClick={() => setModal(false)}>
                <X size={18} />
              </button>
            </header>
            <div className="class-form-grid">
              <label>
                ชื่อห้องเรียน *
                <input
                  value={value.className}
                  onChange={(e) =>
                    setValue({ ...value, className: e.target.value })
                  }
                  placeholder="เช่น ม.5/1"
                />
              </label>
              <label>
                ระดับชั้น *
                <select
                  value={value.gradeLevel}
                  onChange={(e) =>
                    setValue({ ...value, gradeLevel: e.target.value })
                  }
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n}>ม.{n}</option>
                  ))}
                </select>
              </label>
              <label>
                หมายเลขห้อง *
                <input
                  type="number"
                  min="1"
                  value={value.roomNumber}
                  onChange={(e) =>
                    setValue({ ...value, roomNumber: e.target.value })
                  }
                />
              </label>
              <label>
                ครูที่ปรึกษา *
                <select
                  value={value.advisorTeacherId || ""}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      advisorTeacherId: Number(e.target.value) || null,
                    })
                  }
                >
                  <option value="">เลือกครูที่ปรึกษา</option>
                  {teachers.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ปีการศึกษา *
                <input
                  value={value.academicYear}
                  onChange={(e) =>
                    setValue({ ...value, academicYear: e.target.value })
                  }
                />
              </label>
              <label>
                ภาคเรียน *
                <select
                  value={value.semester}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      semester: e.target.value as "1" | "2",
                    })
                  }
                >
                  <option value="1">ภาคเรียนที่ 1</option>
                  <option value="2">ภาคเรียนที่ 2</option>
                </select>
              </label>
              <div className="class-status">
                <b>สถานะ *</b>
                <button
                  type="button"
                  className={`toggle ${value.isActive ? "on" : ""}`}
                  onClick={() =>
                    setValue({ ...value, isActive: !value.isActive })
                  }
                >
                  <i />
                </button>
                <span>{value.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span>
              </div>
              <label className="wide">
                หมายเหตุ (ถ้ามี)
                <textarea
                  maxLength={255}
                  value={value.note}
                  onChange={(e) => setValue({ ...value, note: e.target.value })}
                  placeholder="ระบุหมายเหตุเพิ่มเติม"
                />
                <small>{value.note.length} / 255</small>
              </label>
              {error && <p className="class-form-error">{error}</p>}
            </div>
            <footer>
              <button
                className="admin-button secondary"
                onClick={() => setModal(false)}
              >
                ยกเลิก
              </button>
              <button
                className="admin-button primary"
                onClick={save}
                disabled={busy}
              >
                <Save size={16} />
                {busy
                  ? "กำลังบันทึก..."
                  : editing
                    ? "บันทึกการแก้ไข"
                    : "บันทึกห้องเรียน"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {toast && <div className="subject-toast success">{toast}</div>}
    </main>
  );
}
