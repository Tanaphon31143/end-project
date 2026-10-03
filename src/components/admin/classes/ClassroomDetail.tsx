"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Eye, Pencil, Search, ShieldCheck, Trash2, UserRound, UsersRound } from "lucide-react";
import type { Classroom, ClassStudent } from "./types";
import { confirmDanger, showActionSuccess } from "@/lib/sweet-alert";

type Props = { classroom: Classroom; initialStudents: ClassStudent[] };

export default function ClassroomDetail({ classroom, initialStudents }: Props) {
  const router = useRouter();
  const [students, setStudents] = useState(initialStudents);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 8;
  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return normalized ? students.filter((student) => student.name.toLocaleLowerCase("th").includes(normalized) || student.code.toLocaleLowerCase("th").includes(normalized)) : students;
  }, [query, students]);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const shownStudents = filteredStudents.slice((page - 1) * pageSize, page * pageSize);
  const registeredFaces = students.filter((student) => student.faceRegistered).length;

  async function removeStudent(student: ClassStudent) {
    const confirmed = await confirmDanger({ title: "ลบนักเรียนออกจากระบบ?", text: `${student.name} และข้อมูลใบหน้าที่ลงทะเบียนไว้จะถูกลบด้วย`, confirmText: "ลบนักเรียน" });
    if (!confirmed) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/students?id=${student.id}`, { method: "DELETE" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "ลบนักเรียนไม่สำเร็จ");
      setStudents((current) => current.filter((item) => item.id !== student.id));
      void showActionSuccess(data.message || "ลบนักเรียนสำเร็จ");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "เกิดข้อผิดพลาด"); }
    finally { setBusy(false); }
  }

  return <main className="admin-content class-detail-page">
    <Link className="class-back-link" href="/admin/classes"><ArrowLeft size={17} />กลับไปห้องเรียนทั้งหมด</Link>
    <header className="class-detail-hero">
      <div className="class-detail-title"><div className="classroom-monogram large" aria-hidden="true">{classroom.name.replace("ม.", "").slice(0, 2)}</div><div><div className="class-title-line"><h1>ห้อง {classroom.name}</h1><span className={classroom.isActive ? "is-active" : "is-inactive"}>{classroom.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span></div><p>ปีการศึกษา {classroom.academicYear} · ภาคเรียนที่ {classroom.semester}</p></div></div>
      <Link className="admin-button secondary" href={`/admin/students?class=${classroom.id}`}><UsersRound size={17} />จัดการนักเรียน</Link>
    </header>
    <section className="class-detail-overview" aria-label="ข้อมูลห้องเรียน">
      <div className="class-advisor-panel"><UserRound size={20} /><div><span>ครูที่ปรึกษา</span><strong>{classroom.advisorName}</strong></div></div>
      <dl><div><dt>นักเรียนในห้อง</dt><dd>{students.length} <span>คน</span></dd></div><div><dt>ลงทะเบียนใบหน้า</dt><dd>{registeredFaces} <span>คน</span></dd></div><div><dt>ยังไม่ลงทะเบียน</dt><dd>{students.length - registeredFaces} <span>คน</span></dd></div></dl>
      {classroom.note && <p className="class-note">{classroom.note}</p>}
    </section>
    <section className="class-roster" aria-labelledby="class-roster-title">
      <div className="class-roster-head"><div><h2 id="class-roster-title">รายชื่อนักเรียน</h2><p>ข้อมูลสมาชิกและสถานะการลงทะเบียนใบหน้า</p></div><label className="classes-search"><Search size={17} aria-hidden="true" /><span className="sr-only">ค้นหานักเรียน</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหาชื่อหรือรหัสนักเรียน" /></label></div>
      {error && <p className="class-detail-error">{error}</p>}
      <div className="class-roster-table-wrap">
        <table className="class-roster-table"><thead><tr><th>เลขที่</th><th>นักเรียน</th><th>เพศ</th><th>สถานะ</th><th>ข้อมูลใบหน้า</th><th><span className="sr-only">การจัดการ</span></th></tr></thead><tbody>
          {shownStudents.map((student) => <tr key={student.id}>
            <td data-label="เลขที่"><strong className="student-number">{student.number || "–"}</strong></td>
            <td data-label="นักเรียน"><div className="class-student-name"><span>{student.name.slice(0, 1)}</span><div><b>{student.name}</b><small>{student.code}</small></div></div></td>
            <td data-label="เพศ">{student.gender}</td>
            <td data-label="สถานะ"><span className="roster-status"><CheckCircle2 size={14} />{student.status}</span></td>
            <td data-label="ข้อมูลใบหน้า"><span className={`face-status ${student.faceRegistered ? "registered" : "pending"}`}><ShieldCheck size={14} />{student.faceRegistered ? "ลงทะเบียนแล้ว" : "ยังไม่ลงทะเบียน"}</span></td>
            <td data-label="การจัดการ"><div className="student-icon-actions"><button title="ดูรายละเอียด" aria-label={`ดูรายละเอียด ${student.name}`} onClick={() => router.push(`/admin/students?student=${student.id}&mode=view`)}><Eye size={16} /></button><button title="แก้ไข" aria-label={`แก้ไข ${student.name}`} onClick={() => router.push(`/admin/students?student=${student.id}&mode=edit`)}><Pencil size={16} /></button><button title="ลบ" aria-label={`ลบ ${student.name}`} className="danger" disabled={busy} onClick={() => void removeStudent(student)}><Trash2 size={16} /></button></div></td>
          </tr>)}
        </tbody></table>
        {!shownStudents.length && <div className="classes-empty compact"><Search size={23} /><h3>{students.length ? "ไม่พบนักเรียนที่ค้นหา" : "ยังไม่มีนักเรียนในห้องนี้"}</h3><p>{students.length ? "ลองค้นหาด้วยชื่อหรือรหัสนักเรียนอีกครั้ง" : "เพิ่มนักเรียนเข้าห้องเพื่อเริ่มจัดการรายชื่อ"}</p></div>}
      </div>
      {filteredStudents.length > pageSize && <footer className="class-pagination"><span>แสดง {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredStudents.length)} จาก {filteredStudents.length} คน</span><div><button aria-label="หน้าก่อนหน้า" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft size={16} /></button><span>หน้า {page} / {totalPages}</span><button aria-label="หน้าถัดไป" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight size={16} /></button></div></footer>}
    </section>
  </main>;
}
