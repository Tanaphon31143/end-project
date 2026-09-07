"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3, Eye, History, Pencil, Plus, Search, UserRound, X } from "lucide-react";
import type { AttendanceAudit, AttendancePageData, AttendanceRecord, AttendanceStatus } from "./types";

const labels: Record<AttendanceStatus, string> = { PRESENT: "มาเรียน", LATE: "สาย", ABSENT: "ขาด", LEAVE: "ลา" };
const tones: Record<AttendanceStatus, string> = { PRESENT: "green", LATE: "orange", ABSENT: "red", LEAVE: "blue" };
type Detail = { record: AttendanceRecord; audits: AttendanceAudit[] };

export function AttendanceManager({ initialData, today }: { initialData: AttendancePageData; today: string }) {
  const [records, setRecords] = useState(initialData.records);
  const [filters, setFilters] = useState({ search: "", date: "", subjectId: "", classroomId: "", status: "" });
  const [addOpen, setAddOpen] = useState(false), [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  const [form, setForm] = useState({ studentId: "", subjectId: "", attendanceDate: today, checkInTime: "08:00", status: "PRESENT" as AttendanceStatus, note: "" });
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("PRESENT"), [editNote, setEditNote] = useState("");

  const counts = useMemo(() => Object.fromEntries(Object.keys(labels).map(status => [status, records.filter(row => row.status === status).length])) as Record<AttendanceStatus, number>, [records]);
  const selectedStudent = initialData.students.find(item => item.id === Number(form.studentId));
  const availableSubjects = initialData.subjects.filter(item => !selectedStudent || !item.classroomId || item.classroomId === selectedStudent.classroomId);

  async function search(nextFilters = filters) {
    setLoading(true); setMessage("");
    try {
      const query = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value));
      const response = await fetch(`/api/attendance?${query}`, { cache: "no-store" });
      const data = await response.json() as { records?: AttendanceRecord[]; message?: string };
      if (!response.ok) throw new Error(data.message || "โหลดข้อมูลไม่สำเร็จ");
      setRecords(data.records || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  }

  async function openDetail(id: number) {
    setLoading(true); setMessage("");
    try {
      const response = await fetch(`/api/attendance?recordId=${id}`, { cache: "no-store" });
      const data = await response.json() as Detail & { message?: string };
      if (!response.ok) throw new Error(data.message || "โหลดรายละเอียดไม่สำเร็จ");
      setDetail(data); setEditStatus(data.record.status); setEditNote("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  }

  async function addRecord() {
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "เพิ่มข้อมูลไม่สำเร็จ");
      setAddOpen(false); setForm({ studentId: "", subjectId: "", attendanceDate: today, checkInTime: "08:00", status: "PRESENT", note: "" });
      await search(); setMessage(data.message || "เพิ่มข้อมูลแล้ว");
    } catch (error) { setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  }

  async function updateStatus() {
    if (!detail) return;
    setLoading(true); setMessage("");
    try {
      const response = await fetch("/api/attendance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: detail.record.id, status: editStatus, note: editNote }) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "แก้ไขสถานะไม่สำเร็จ");
      await Promise.all([search(), openDetail(detail.record.id)]); setMessage(data.message || "แก้ไขสถานะแล้ว");
    } catch (error) { setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด"); }
    finally { setLoading(false); }
  }

  function resetFilters() { const empty = { search: "", date: "", subjectId: "", classroomId: "", status: "" }; setFilters(empty); void search(empty); }

  return <>
    <div className="page-intro"><div><h2>ประวัติการเข้าเรียน</h2><p>ค้นหา ตรวจสอบ และแก้ไขข้อมูลพร้อมประวัติผู้ดำเนินการ</p></div><button className="admin-button primary" onClick={() => setAddOpen(true)}><Plus size={18} />เพิ่มข้อมูล</button></div>
    {message && <div className="attendance-message">{message}</div>}
    <section className="attendance-filter dashboard-card">
      <label className="attendance-search"><Search size={18}/><input placeholder="ค้นหารหัสหรือชื่อนักเรียน" value={filters.search} onChange={event => setFilters({ ...filters, search: event.target.value })} onKeyDown={event => { if (event.key === "Enter") void search(); }}/></label>
      <label><span>วันที่</span><input type="date" value={filters.date} onChange={event => setFilters({ ...filters, date: event.target.value })}/></label>
      <label><span>รายวิชา</span><select value={filters.subjectId} onChange={event => setFilters({ ...filters, subjectId: event.target.value })}><option value="">ทุกวิชา</option>{initialData.subjects.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
      <label><span>ห้อง</span><select value={filters.classroomId} onChange={event => setFilters({ ...filters, classroomId: event.target.value })}><option value="">ทุกห้อง</option>{initialData.classrooms.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span>สถานะ</span><select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">ทุกสถานะ</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="attendance-filter-actions"><button className="admin-button primary" disabled={loading} onClick={() => void search()}>{loading ? "กำลังโหลด..." : "ค้นหา"}</button><button className="admin-button secondary" onClick={resetFilters}>ล้างตัวกรอง</button></div>
    </section>
    <div className="mini-summary attendance-summary">{(["PRESENT", "LATE", "ABSENT", "LEAVE"] as AttendanceStatus[]).map(status => <span key={status} className={tones[status]}><b>{counts[status]}</b>{labels[status]}</span>)}</div>
    <section className="dashboard-card admin-table-card attendance-table"><div className="card-head"><div><h2>รายการเข้าเรียน</h2><p>ผลลัพธ์ล่าสุดสูงสุด 500 รายการ</p></div><span className="row-count">ทั้งหมด {records.length} รายการ</span></div><div className="admin-data-wrap"><table><thead><tr><th>วันที่</th><th>นักเรียน</th><th>ห้อง</th><th>รายวิชา</th><th>เวลา</th><th>ความมั่นใจ</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>{records.map(row => <tr key={row.id}><td><CalendarDays size={14}/> {row.attendanceDate.split("-").reverse().join("/")}</td><td><div className="attendance-person"><span>{row.studentName.slice(0, 2)}</span><div><b>{row.studentName}</b><small>{row.studentCode}</small></div></div></td><td>{row.className}</td><td><b>{row.subjectCode}</b><small className="subject-name">{row.subjectName}</small></td><td>{row.checkInTime ? <><Clock3 size={14}/> {row.checkInTime}</> : "-"}</td><td>{row.confidence == null ? "บันทึกเอง" : `${Number(row.confidence).toFixed(2)}%`}</td><td><span className={`data-badge ${tones[row.status]}`}>{labels[row.status]}</span></td><td><div className="table-actions"><button onClick={() => void openDetail(row.id)}><Eye size={16}/><span>ดู/แก้ไข</span></button></div></td></tr>)}{!records.length && <tr><td colSpan={8}><div className="subject-empty"><span>ไม่พบข้อมูลการเข้าเรียน</span><p>ลองเปลี่ยนเงื่อนไขการค้นหา หรือเพิ่มข้อมูลใหม่</p></div></td></tr>}</tbody></table></div></section>

    {addOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAddOpen(false); }}><section className="admin-modal attendance-modal" role="dialog" aria-modal="true"><header><div><h2>เพิ่มข้อมูลการเข้าเรียน</h2><p>รายการที่เพิ่มเองจะมีค่าความมั่นใจเป็น “บันทึกเอง”</p></div><button onClick={() => setAddOpen(false)} aria-label="ปิด"><X/></button></header><div className="attendance-form">
      <label><span>นักเรียน *</span><select value={form.studentId} onChange={event => setForm({ ...form, studentId: event.target.value, subjectId: "" })}><option value="">เลือกนักเรียน</option>{initialData.students.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name} · {item.className}</option>)}</select></label>
      <label><span>รายวิชา *</span><select value={form.subjectId} onChange={event => setForm({ ...form, subjectId: event.target.value })}><option value="">เลือกรายวิชา</option>{availableSubjects.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
      <label><span>วันที่ *</span><input type="date" value={form.attendanceDate} onChange={event => setForm({ ...form, attendanceDate: event.target.value })}/></label>
      <label><span>สถานะ *</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as AttendanceStatus })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {(form.status === "PRESENT" || form.status === "LATE") && <label><span>เวลาเข้าเรียน *</span><input type="time" value={form.checkInTime} onChange={event => setForm({ ...form, checkInTime: event.target.value })}/></label>}
      <label className="wide"><span>หมายเหตุ</span><textarea rows={3} maxLength={500} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="เหตุผลหรือรายละเอียดเพิ่มเติม"/></label>
    </div><footer><button className="admin-button secondary" onClick={() => setAddOpen(false)}>ยกเลิก</button><button className="admin-button primary" disabled={loading || !form.studentId || !form.subjectId} onClick={() => void addRecord()}><Plus size={17}/>บันทึกข้อมูล</button></footer></section></div>}

    {detail && <div className="admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setDetail(null); }}><section className="admin-modal attendance-modal detail-modal" role="dialog" aria-modal="true"><header><div><h2>รายละเอียดการเข้าเรียน</h2><p>รายการ #{detail.record.id}</p></div><button onClick={() => setDetail(null)} aria-label="ปิด"><X/></button></header>
      <div className="attendance-detail-grid"><div><UserRound/><span>นักเรียน</span><b>{detail.record.studentName}</b><small>{detail.record.studentCode} · {detail.record.className}</small></div><div><CalendarDays/><span>วันและเวลา</span><b>{detail.record.attendanceDate.split("-").reverse().join("/")}</b><small>{detail.record.checkInTime || "ไม่มีเวลาเช็คชื่อ"}</small></div><div><Clock3/><span>รายวิชา</span><b>{detail.record.subjectCode}</b><small>{detail.record.subjectName}</small></div><div><History/><span>แหล่งข้อมูล</span><b>{detail.record.confidence == null ? "ผู้ดูแลบันทึก" : `Face Recognition ${Number(detail.record.confidence).toFixed(2)}%`}</b><small>สร้างเมื่อ {detail.record.createdAt}</small></div></div>
      <div className="attendance-edit"><h3><Pencil size={17}/> แก้ไขสถานะ</h3><div><label><span>สถานะใหม่</span><select value={editStatus} onChange={event => setEditStatus(event.target.value as AttendanceStatus)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>เหตุผล/หมายเหตุ</span><input maxLength={500} value={editNote} onChange={event => setEditNote(event.target.value)} placeholder="ระบุเหตุผลที่แก้ไข"/></label><button className="admin-button primary" disabled={loading || editStatus === detail.record.status} onClick={() => void updateStatus()}>บันทึกสถานะ</button></div></div>
      <div className="audit-history"><h3><History size={17}/> ประวัติผู้แก้ไข</h3>{detail.audits.length ? detail.audits.map(audit => <article key={audit.id}><i/><div><b>{audit.action === "ADD" ? "เพิ่มข้อมูลการเข้าเรียน" : `เปลี่ยนจาก ${audit.oldStatus ? labels[audit.oldStatus] : "-"} เป็น ${labels[audit.newStatus]}`}</b><p>โดย {audit.adminName} · {audit.createdAt}</p>{audit.note && <small>หมายเหตุ: {audit.note}</small>}</div></article>) : <p className="audit-empty">ยังไม่มีประวัติการแก้ไข (รายการเก่าก่อนเปิดใช้ Audit Log)</p>}</div>
    </section></div>}
  </>;
}
