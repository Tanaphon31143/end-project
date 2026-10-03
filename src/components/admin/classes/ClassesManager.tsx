"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, BookOpen, Check, ChevronDown, MoreHorizontal, Pencil, Plus, Save, Search, Trash2, UsersRound, X } from "lucide-react";
import type { Classroom, ClassroomValue, TeacherOption } from "./types";
import { confirmDanger, showActionSuccess } from "@/lib/sweet-alert";

type Props = { initialClasses: Classroom[]; teachers: TeacherOption[]; academicYear: string; semester: "1" | "2" };

const emptyValue = (academicYear: string, semester: "1" | "2"): ClassroomValue => ({
  className: "", gradeLevel: "ม.5", roomNumber: "1", advisorTeacherId: null,
  academicYear, semester, isActive: true, note: "",
});

export default function ClassesManager({ initialClasses, teachers, academicYear, semester }: Props) {
  const [classes, setClasses] = useState(initialClasses);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("ทั้งหมด");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [menu, setMenu] = useState<number | null>(null);
  const [value, setValue] = useState<ClassroomValue>(() => emptyValue(academicYear, semester));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const levels = useMemo(() => ["ทั้งหมด", ...Array.from(new Set(classes.map((room) => room.level)))], [classes]);
  const filteredClasses = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return classes.filter((room) =>
      (level === "ทั้งหมด" || room.level === level) &&
      (!normalized || room.name.toLocaleLowerCase("th").includes(normalized) || room.advisorName.toLocaleLowerCase("th").includes(normalized)),
    );
  }, [classes, level, query]);
  const totalStudents = classes.reduce((sum, room) => sum + room.studentCount, 0);
  const activeRooms = classes.filter((room) => room.isActive).length;

  function open(classroom?: Classroom) {
    setEditing(classroom || null);
    setError("");
    setValue(classroom ? {
      className: classroom.name, gradeLevel: classroom.level, roomNumber: classroom.roomNumber,
      advisorTeacherId: classroom.advisorTeacherId, academicYear: classroom.academicYear,
      semester: classroom.semester, isActive: classroom.isActive, note: classroom.note,
    } : emptyValue(academicYear, semester));
    setModal(true);
  }

  async function reload() {
    const response = await fetch("/api/classes", { cache: "no-store" });
    const data = await response.json();
    setClasses(data.classrooms);
  }

  async function save() {
    if (!value.className.trim()) return setError("กรุณากรอกชื่อห้องเรียน");
    if (!value.advisorTeacherId) return setError("กรุณาเลือกครูที่ปรึกษา");
    setBusy(true);
    try {
      const response = await fetch("/api/classes", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, id: editing?.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "บันทึกห้องเรียนไม่สำเร็จ");
      await reload();
      setModal(false);
      void showActionSuccess(data.message || "บันทึกห้องเรียนสำเร็จ");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด");
    } finally { setBusy(false); }
  }

  async function remove(classroom: Classroom) {
    setMenu(null);
    const confirmed = await confirmDanger({ title: "ลบห้องเรียน?", text: `ห้อง ${classroom.name} จะถูกนำออกจากระบบ`, confirmText: "ลบห้องเรียน" });
    if (!confirmed) return;
    const response = await fetch(`/api/classes?id=${classroom.id}`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) { await reload(); void showActionSuccess(data.message || "ลบห้องเรียนสำเร็จ"); }
    else setError(data.message || "ลบห้องเรียนไม่สำเร็จ");
  }

  return <main className="admin-content classes-page">
    <header className="classes-hero">
      <div className="classes-heading">
        <div className="classes-heading-icon" aria-hidden="true"><BookOpen size={22} /></div>
        <div><h1>ห้องเรียน</h1><p>จัดระเบียบห้อง ครูที่ปรึกษา และรายชื่อนักเรียนในที่เดียว</p></div>
      </div>
      <button className="admin-button primary" onClick={() => open()}><Plus size={18} />เพิ่มห้องเรียน</button>
    </header>

    <section className="classes-summary" aria-label="ภาพรวมห้องเรียน">
      <div className="term-summary"><span>ภาคเรียนปัจจุบัน</span><strong>{semester}/{academicYear}</strong></div>
      <dl>
        <div><dt>ห้องเรียนทั้งหมด</dt><dd>{classes.length}</dd></div>
        <div><dt>กำลังเปิดใช้งาน</dt><dd>{activeRooms}</dd></div>
        <div><dt>นักเรียนทั้งหมด</dt><dd>{totalStudents}</dd></div>
      </dl>
    </section>

    <section className="classes-directory" aria-labelledby="classes-list-title">
      <div className="classes-toolbar">
        <div><h2 id="classes-list-title">รายชื่อห้องเรียน</h2><p>เลือกห้องเพื่อดูและจัดการรายชื่อนักเรียน</p></div>
        <div className="classes-controls">
          <label className="classes-search"><Search size={17} aria-hidden="true" /><span className="sr-only">ค้นหาห้องเรียนหรือครูที่ปรึกษา</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาห้องหรือครูที่ปรึกษา" /></label>
          <label className="classes-filter"><span className="sr-only">กรองระดับชั้น</span><select value={level} onChange={(event) => setLevel(event.target.value)}>{levels.map((item) => <option value={item} key={item}>{item === "ทั้งหมด" ? "ทุกระดับชั้น" : item}</option>)}</select><ChevronDown size={16} aria-hidden="true" /></label>
        </div>
      </div>

      <div className="classroom-list">
        {filteredClasses.map((classroom) => <article className="classroom-row" key={classroom.id}>
          <Link className="classroom-row-link" href={`/admin/classes/${classroom.id}`} aria-label={`เปิดห้อง ${classroom.name}`}>
            <div className="classroom-monogram" aria-hidden="true">{classroom.name.replace("ม.", "").slice(0, 2)}</div>
            <div className="classroom-identity"><div><h3>{classroom.name}</h3><span className={classroom.isActive ? "is-active" : "is-inactive"}>{classroom.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span></div><p>ปีการศึกษา {classroom.academicYear} · ภาคเรียนที่ {classroom.semester}</p></div>
            <div className="classroom-advisor"><span>ครูที่ปรึกษา</span><strong>{classroom.advisorName}</strong></div>
            <div className="classroom-count"><UsersRound size={17} aria-hidden="true" /><strong>{classroom.studentCount}</strong><span>คน</span></div>
            <span className="classroom-open-hint">ดูห้องเรียน <ArrowUpRight size={17} /></span>
          </Link>
          <button className="classroom-more" aria-label={`จัดการห้อง ${classroom.name}`} aria-expanded={menu === classroom.id} onClick={() => setMenu(menu === classroom.id ? null : classroom.id)}><MoreHorizontal size={19} /></button>
          {menu === classroom.id && <div className="classroom-inline-menu">
            <Link href={`/admin/classes/${classroom.id}`}><ArrowUpRight size={15} />ดูห้องเรียน</Link>
            <button onClick={() => { setMenu(null); open(classroom); }}><Pencil size={15} />แก้ไขข้อมูล</button>
            <button className="danger" onClick={() => void remove(classroom)}><Trash2 size={15} />ลบห้องเรียน</button>
          </div>}
        </article>)}
        {!filteredClasses.length && <div className="classes-empty"><Search size={24} /><h3>ไม่พบห้องเรียนที่ค้นหา</h3><p>ลองเปลี่ยนคำค้นหาหรือตัวกรองระดับชั้น</p><button onClick={() => { setQuery(""); setLevel("ทั้งหมด"); }}>ล้างตัวกรอง</button></div>}
      </div>
    </section>

    {menu !== null && <button className="classroom-menu-backdrop" aria-label="ปิดเมนู" onClick={() => setMenu(null)} />}

    {modal && createPortal(<div className="class-modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}>
      <section className="class-modal" role="dialog" aria-modal="true" aria-labelledby="class-modal-title">
        <header><div><h2 id="class-modal-title">{editing ? "แก้ไขห้องเรียน" : "เพิ่มห้องเรียน"}</h2><p>{editing ? "ปรับข้อมูลห้องเรียนให้เป็นปัจจุบัน" : "กรอกข้อมูลสำหรับห้องเรียนใหม่"}</p></div><button aria-label="ปิดหน้าต่าง" onClick={() => setModal(false)}><X size={19} /></button></header>
        <div className="class-form-grid">
          <label>ชื่อห้องเรียน *<input value={value.className} onChange={(event) => setValue({ ...value, className: event.target.value })} placeholder="เช่น ม.5/1" /></label>
          <label>ระดับชั้น *<select value={value.gradeLevel} onChange={(event) => setValue({ ...value, gradeLevel: event.target.value })}>{[1,2,3,4,5,6].map((item) => <option key={item}>ม.{item}</option>)}</select></label>
          <label>หมายเลขห้อง *<input type="number" min="1" value={value.roomNumber} onChange={(event) => setValue({ ...value, roomNumber: event.target.value })} /></label>
          <label>ครูที่ปรึกษา *<select value={value.advisorTeacherId || ""} onChange={(event) => setValue({ ...value, advisorTeacherId: Number(event.target.value) || null })}><option value="">เลือกครูที่ปรึกษา</option>{teachers.map((teacher) => <option value={teacher.id} key={teacher.id}>{teacher.name}</option>)}</select></label>
          <label>ปีการศึกษา *<input value={value.academicYear} onChange={(event) => setValue({ ...value, academicYear: event.target.value })} /></label>
          <label>ภาคเรียน *<select value={value.semester} onChange={(event) => setValue({ ...value, semester: event.target.value as "1" | "2" })}><option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option></select></label>
          <div className="class-status"><b>สถานะ *</b><button type="button" className={`toggle ${value.isActive ? "on" : ""}`} aria-pressed={value.isActive} onClick={() => setValue({ ...value, isActive: !value.isActive })}><i /></button><span>{value.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span></div>
          <label className="wide">หมายเหตุ (ถ้ามี)<textarea maxLength={255} value={value.note} onChange={(event) => setValue({ ...value, note: event.target.value })} placeholder="ระบุหมายเหตุเพิ่มเติม" /><small>{value.note.length} / 255</small></label>
          {error && <p className="class-form-error">{error}</p>}
        </div>
        <footer><button className="admin-button secondary" onClick={() => setModal(false)}>ยกเลิก</button><button className="admin-button primary" onClick={save} disabled={busy}>{busy ? <span className="class-saving" /> : editing ? <Check size={16} /> : <Save size={16} />}{busy ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "บันทึกห้องเรียน"}</button></footer>
      </section>
    </div>, document.body)}
  </main>;
}
