"use client";

import { useMemo, useState } from "react";
import { Eye, KeyRound, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Badge, PersonCell } from "@/components/admin/AdminPage";
import {
  EMPTY_USER,
  ROLE_LABELS,
  type AdminUserRecord,
  type UserFormValue,
  type UserRole,
} from "./types";

type ModalMode = "create" | "view" | "edit" | "password";
type Errors = Partial<Record<keyof UserFormValue, string>>;

function roleTone(role: UserRole) {
  return role === "admin" ? "purple" : role === "teacher" ? "blue" : "gray";
}

export default function UsersManager({ initialUsers }: { initialUsers: AdminUserRecord[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [selected, setSelected] = useState<AdminUserRecord | null>(null);
  const [value, setValue] = useState<UserFormValue>(EMPTY_USER);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("th");
    return users.filter((user) => {
      const matchesQuery = !needle || [user.id, user.code, user.name, user.email]
        .some((item) => item.toLocaleLowerCase("th").includes(needle));
      return matchesQuery && (!role || user.role === role);
    });
  }, [query, role, users]);

  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3500);
  }

  function open(mode: ModalMode, user: AdminUserRecord | null = null) {
    setSelected(user);
    setModal(mode);
    setErrors({});
    setValue(user ? {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      code: user.code,
      password: "",
    } : { ...EMPTY_USER });
  }

  async function reload() {
    const response = await fetch("/api/users", { cache: "no-store" });
    const data = await response.json() as { users?: AdminUserRecord[]; message?: string };
    if (!response.ok || !data.users) throw new Error(data.message || "โหลดข้อมูลล่าสุดไม่สำเร็จ");
    setUsers(data.users);
  }

  function validate() {
    const next: Errors = {};
    if (modal === "password") {
      if (value.password.length < 8) next.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    } else {
      if (!value.name.trim()) next.name = "กรุณากรอกชื่อ-สกุล";
      if (!/^\S+@\S+\.\S+$/.test(value.email.trim())) next.email = "กรุณากรอกอีเมลให้ถูกต้อง";
      if (value.role !== "admin" && !value.code.trim()) next.code = "กรุณากรอกรหัสผู้ใช้งาน";
      if (modal === "create" && value.password.length < 8) next.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
      if (value.password.length > 128) next.password = "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    try {
      const method = modal === "password" ? "PATCH" : modal === "edit" ? "PUT" : "POST";
      const response = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, id: selected?.id }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "บันทึกข้อมูลไม่สำเร็จ");
      await reload();
      setModal(null);
      notify(data.message || "บันทึกข้อมูลสำเร็จ", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(user: AdminUserRecord) {
    if (!window.confirm(`ยืนยันการลบบัญชี ${user.name}? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/users?id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "ลบบัญชีไม่สำเร็จ");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      notify(data.message || "ลบบัญชีสำเร็จ", "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setBusy(false);
    }
  }

  const readOnly = modal === "view";
  const passwordOnly = modal === "password";
  const modalTitle = modal === "create" ? "เพิ่มผู้ใช้งาน" : modal === "edit" ? "แก้ไขผู้ใช้งาน" : modal === "password" ? "เปลี่ยนรหัสผ่าน" : "รายละเอียดผู้ใช้งาน";

  return <main className="admin-content">
    <div className="page-intro">
      <div><h2>บัญชีผู้ใช้งาน</h2><p>จัดการบัญชี บทบาท และสิทธิ์การเข้าถึงระบบ</p></div>
      <button className="admin-button primary" onClick={() => open("create")}><Plus size={18}/>เพิ่มผู้ใช้งาน</button>
    </div>
    <div className="admin-filters">
      <label><Search size={18}/><input aria-label="ค้นหาผู้ใช้งาน" placeholder="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
      <select aria-label="บทบาทผู้ใช้งาน" value={role} onChange={(event) => setRole(event.target.value as UserRole | "")}>
        <option value="">ทุกบทบาท</option><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="student">Student</option>
      </select>
      <button className="admin-button secondary" onClick={() => { setQuery(""); setRole(""); }}>ล้างตัวกรอง</button>
    </div>
    <section className="dashboard-card admin-table-card">
      <div className="card-head"><div><h2>รายชื่อผู้ใช้งาน</h2><p>แสดง {filtered.length} จาก {users.length} บัญชี</p></div><span className="row-count">ทั้งหมด {filtered.length} รายการ</span></div>
      <div className="admin-data-wrap"><table><thead><tr><th>รหัส</th><th>ชื่อผู้ใช้งาน</th><th>บทบาท</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
        <tbody>{filtered.length ? filtered.map((user) => <tr key={user.id}>
          <td><b>{user.code || user.id}</b></td>
          <td><PersonCell initials={user.name.slice(0, 2)} name={user.name} detail={user.email}/></td>
          <td><Badge tone={roleTone(user.role)}>{ROLE_LABELS[user.role]}</Badge></td>
          <td><Badge tone={user.status === "ACTIVE" ? "green" : "red"}>{user.status === "ACTIVE" ? "ใช้งาน" : "ระงับ"}</Badge></td>
          <td><div className="table-actions">
            <button onClick={() => open("view", user)} title="ดู"><Eye size={16}/><span>ดู</span></button>
            <button onClick={() => open("edit", user)} title="แก้ไข"><Pencil size={16}/><span>แก้ไข</span></button>
            <button onClick={() => open("password", user)} title="เปลี่ยนรหัสผ่าน"><KeyRound size={16}/><span>เปลี่ยนรหัสผ่าน</span></button>
            <button className="danger" disabled={busy} onClick={() => remove(user)} title="ลบ"><Trash2 size={16}/><span>ลบ</span></button>
          </div></td>
        </tr>) : <tr><td colSpan={5}><div className="subject-empty"><span>ไม่พบผู้ใช้งาน</span><p>ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p></div></td></tr>}</tbody>
      </table></div>
    </section>

    {modal && <div className="subject-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setModal(null); }}>
      <section className="subject-modal user-modal" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
        <header><div><h2 id="user-modal-title">{modalTitle}</h2><p>{selected ? `${selected.name} · ${selected.email}` : "สร้างบัญชีสำหรับเข้าใช้งานระบบ"}</p></div><button onClick={() => setModal(null)} disabled={busy} aria-label="ปิด"><X size={18}/></button></header>
        <form className="subject-form" onSubmit={(event) => { event.preventDefault(); if (!readOnly) void save(); }}>
          {passwordOnly ? <div className="subject-form-grid">
            <label className="subject-field subject-wide"><span>รหัสผ่านใหม่ <b>*</b></span><input type="password" autoComplete="new-password" value={value.password} onChange={(event) => setValue({ ...value, password: event.target.value })} placeholder="อย่างน้อย 8 ตัวอักษร" autoFocus/>{errors.password && <small>{errors.password}</small>}</label>
          </div> : <div className="subject-form-grid">
            <label className="subject-field"><span>ชื่อ-สกุล <b>*</b></span><input value={value.name} disabled={readOnly} onChange={(event) => setValue({ ...value, name: event.target.value })}/>{errors.name && <small>{errors.name}</small>}</label>
            <label className="subject-field"><span>อีเมล <b>*</b></span><input type="email" value={value.email} disabled={readOnly} onChange={(event) => setValue({ ...value, email: event.target.value })}/>{errors.email && <small>{errors.email}</small>}</label>
            <label className="subject-field"><span>บทบาท <b>*</b></span><select value={value.role} disabled={readOnly} onChange={(event) => setValue({ ...value, role: event.target.value as UserRole, code: event.target.value === "admin" ? "" : value.code })}><option value="admin">Admin</option><option value="teacher">Teacher</option><option value="student">Student</option></select></label>
            <label className="subject-field"><span>สถานะ <b>*</b></span><select value={value.status} disabled={readOnly} onChange={(event) => setValue({ ...value, status: event.target.value as "ACTIVE" | "INACTIVE" })}><option value="ACTIVE">ใช้งาน</option><option value="INACTIVE">ระงับ</option></select></label>
            {value.role !== "admin" && <label className="subject-field"><span>{value.role === "teacher" ? "รหัสครู" : "รหัสนักเรียน"} <b>*</b></span><input value={value.code} disabled={readOnly} onChange={(event) => setValue({ ...value, code: event.target.value })}/>{errors.code && <small>{errors.code}</small>}</label>}
            {modal === "create" && <label className="subject-field"><span>รหัสผ่าน <b>*</b></span><input type="password" autoComplete="new-password" value={value.password} onChange={(event) => setValue({ ...value, password: event.target.value })} placeholder="อย่างน้อย 8 ตัวอักษร"/>{errors.password && <small>{errors.password}</small>}</label>}
          </div>}
          <div className="subject-modal-footer">
            <button type="button" className="admin-button secondary" onClick={() => setModal(null)} disabled={busy}>{readOnly ? "ปิด" : "ยกเลิก"}</button>
            {!readOnly && <button className="admin-button primary" disabled={busy}>{busy && <span className="button-spinner"/>}{busy ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button>}
          </div>
        </form>
      </section>
    </div>}
    {toast && <div className={`subject-toast ${toast.tone}`}>{toast.message}</div>}
  </main>;
}
