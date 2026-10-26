"use client";

import { useMemo, useState } from "react";
import { Eye, KeyRound, Pencil, Plus, Search, Trash2, X, Users, Crown, UserRound, GraduationCap, MoreVertical, Download, SlidersHorizontal, LayoutGrid, List, ChevronDown } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { useAccountPresence, AccountPresenceBadge, AccountPresenceNotice, loginStatusLabel } from "./AccountPresence";
import { PersonCell } from "@/components/admin/AdminPage";
import { confirmDanger, showActionSuccess } from "@/lib/sweet-alert";
import { EMPTY_USER, type AdminUserRecord, type UserFormValue, type UserRole } from "./types";
import { ManagementPageHeader, ManagementSummary, ManagementPagination, ManagementEmpty, exportManagementCsv } from "./UserManagementUI";

type ModalMode = "create" | "view" | "edit" | "password";
type Errors = Partial<Record<keyof UserFormValue, string>>;
const roleNames: Record<UserRole,string> = {admin:"ผู้ดูแลระบบ",teacher:"ครู",student:"นักเรียน"};
function displayDate(value?:string) {
  if(!value)return "—";
  const date=new Date(value.replace(" ","T"));
  return Number.isNaN(date.getTime())?"—":date.toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"});
}

function accountTrend(accounts:AdminUserRecord[]) {
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1).getTime();
  const dates=accounts.map(account=>account.createdAt?new Date(account.createdAt.replace(" ","T")).getTime():NaN).filter(Number.isFinite);
  const monthCount=dates.filter(date=>date>=monthStart).length;
  const previousCount=dates.filter(date=>date<monthStart).length;
  const growth=previousCount?Math.round((accounts.length-previousCount)/previousCount*100):null;
  const series=Array.from({length:8},(_,index)=>dates.filter(date=>date<=now.getTime()-(7-index)*7*86400000).length);
  return {label:growth===null?(monthCount?`ใหม่ ${monthCount}`:"0%"):`${Math.abs(growth)}%`,description:previousCount?"เพิ่มจากต้นเดือน":"เดือนนี้",direction:(growth===null?(monthCount?'up':'flat'):growth>0?'up':growth<0?'down':'flat') as "up"|"down"|"flat",series};
}

export default function UsersManager({initialUsers}:{initialUsers:AdminUserRecord[]}) {
  const [userRecords,setUsers]=useState(initialUsers);
  const {accounts:users,isStale,refresh:refreshPresence}=useAccountPresence(userRecords);
  const [query,setQuery]=useState("");
  const [role,setRole]=useState<UserRole|"">("");
  const [status,setStatus]=useState("");
  const [grade,setGrade]=useState("");
  const [classroom,setClassroom]=useState("");
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);
  const [checked,setChecked]=useState<Set<string>>(new Set());
  const [view,setView]=useState<"list"|"grid">("list");
  const [modal,setModal]=useState<ModalMode|null>(null);
  const [selected,setSelected]=useState<AdminUserRecord|null>(null);
  const [value,setValue]=useState<UserFormValue>(EMPTY_USER);
  const [errors,setErrors]=useState<Errors>({});
  const [busy,setBusy]=useState(false);
  const [toast,setToast]=useState<{message:string;tone:"success"|"error"}|null>(null);
  const grades=useMemo(()=>Array.from(new Set(users.filter(u=>u.role==="student").map(u=>u.classLevel).filter((g):g is string=>Boolean(g)))).sort((a,b)=>a.localeCompare(b,"th",{numeric:true})),[users]);
  const classrooms=useMemo(()=>Array.from(new Map(users.filter(u=>u.role==="student"&&u.classId&&(!grade||u.classLevel===grade)).map(u=>[u.classId!,{id:u.classId!,name:u.className||"ยังไม่ระบุ"}])).values()).sort((a,b)=>a.name.localeCompare(b.name,"th",{numeric:true})),[users,grade]);
  const filtered=useMemo(()=>{const needle=query.trim().toLocaleLowerCase("th");return users.filter(user=>(!needle||[user.id,user.code,user.name,user.email].some(text=>text.toLocaleLowerCase("th").includes(needle)))&&(!role||user.role===role)&&(!status||(status==="ONLINE")===Boolean(user.isLoggedIn))&&(!grade||(user.role==="student"&&user.classLevel===grade))&&(!classroom||(user.role==="student"&&String(user.classId)===classroom)));},[query,role,status,grade,classroom,users]);
  const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const currentPage=Math.min(page,totalPages);
  const pageStart=filtered.length?(currentPage-1)*pageSize+1:0;
  const pageEnd=Math.min(currentPage*pageSize,filtered.length);
  const visibleUsers=filtered.slice(pageStart?pageStart-1:0,pageEnd);
  const selectedUsers=filtered.filter(user=>checked.has(user.id));
  const studentFiltersAvailable=!role||role==="student";
  function changeRole(next:UserRole|""){setRole(next);setPage(1);if(next&&next!=="student"){setGrade("");setClassroom("");}}
  function toggleUser(id:string){setChecked(previous=>{const next=new Set(previous);if(next.has(id))next.delete(id);else next.add(id);return next;});}
  function togglePage(){setChecked(previous=>{const next=new Set(previous);const all=visibleUsers.every(u=>next.has(u.id));visibleUsers.forEach(u=>all?next.delete(u.id):next.add(u.id));return next;});}
  function exportUsers(){const rows=selectedUsers.length?selectedUsers:filtered;exportManagementCsv("users.csv",["รหัสผู้ใช้","ชื่อ-นามสกุล","อีเมล","ประเภทผู้ใช้","ระดับชั้น","ห้องเรียน","สถานะการเข้าสู่ระบบ","วันที่สร้าง"],rows.map(u=>[u.code||u.id,u.name,u.email,roleNames[u.role],u.classLevel||"",u.className||"",loginStatusLabel(Boolean(u.isLoggedIn)),u.createdAt||""]));}
  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3500);
  }

  function open(mode: ModalMode, user: AdminUserRecord | null = null) {
    setSelected(user);
    setModal(mode);
    setErrors({});
    setValue(
      user
        ? {
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            code: user.code,
            password: "",
          }
        : { ...EMPTY_USER },
    );
  }

  async function reload() {
    const response = await fetch("/api/users", { cache: "no-store" });
    const data = (await response.json()) as {
      users?: AdminUserRecord[];
      message?: string;
    };
    if (!response.ok || !data.users)
      throw new Error(data.message || "โหลดข้อมูลล่าสุดไม่สำเร็จ");
    setUsers(data.users);
    await refreshPresence();
  }

  function validate() {
    const next: Errors = {};
    if (modal === "password") {
      if (value.password.length < 8)
        next.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    } else {
      if (!value.name.trim()) next.name = "กรุณากรอกชื่อ-สกุล";
      if (!/^\S+@\S+\.\S+$/.test(value.email.trim()))
        next.email = "กรุณากรอกอีเมลให้ถูกต้อง";
      if (value.role !== "admin" && !value.code.trim())
        next.code = "กรุณากรอกรหัสผู้ใช้งาน";
      if (modal === "create" && value.password.length < 8)
        next.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
      if (value.password.length > 128)
        next.password = "รหัสผ่านต้องไม่เกิน 128 ตัวอักษร";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    try {
      const method =
        modal === "password" ? "PATCH" : modal === "edit" ? "PUT" : "POST";
      const response = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, id: selected?.id }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message || "บันทึกข้อมูลไม่สำเร็จ");
      await reload();
      setModal(null);
      void showActionSuccess(data.message || "บันทึกข้อมูลสำเร็จ");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(user: AdminUserRecord) {
    const confirmed = await confirmDanger({
      title: "ลบบัญชีผู้ใช้งาน?",
      text: `${user.name} จะไม่สามารถเข้าสู่ระบบได้ และการดำเนินการนี้ย้อนกลับไม่ได้`,
      confirmText: "ลบบัญชี",
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await fetch(
        `/api/users?id=${encodeURIComponent(user.id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "ลบบัญชีไม่สำเร็จ");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      void showActionSuccess(data.message || "ลบบัญชีสำเร็จ");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  const readOnly=modal==="view";
  const passwordOnly=modal==="password";
  const modalTitle=modal==="create"?"เพิ่มผู้ใช้งาน":modal==="edit"?"แก้ไขผู้ใช้งาน":modal==="password"?"เปลี่ยนรหัสผ่าน":"รายละเอียดผู้ใช้งาน";
  function createUser(nextRole:UserRole){open("create");setValue({...EMPTY_USER,role:nextRole});}
  function actions(user:AdminUserRecord) {
    return <div className="um-actions"><button type="button" className="um-icon-button" aria-label={`ดูรายละเอียด ${user.name}`} title="ดูรายละเอียด" onClick={()=>open("view",user)}><Eye size={17}/></button><button type="button" className="um-icon-button" aria-label={`แก้ไข ${user.name}`} title="แก้ไข" onClick={()=>open("edit",user)}><Pencil size={17}/></button><button type="button" className="um-icon-button" aria-label={`ตัวเลือกเพิ่มเติม ${user.name}`} popoverTarget={`user-actions-${user.id}`} onClick={event=>{const menu=document.getElementById(`user-actions-${user.id}`);if(!menu)return;const rect=event.currentTarget.getBoundingClientRect();menu.style.left=`${Math.max(8,Math.min(rect.right-208,window.innerWidth-216))}px`;menu.style.top=`${rect.bottom+110>window.innerHeight?Math.max(8,rect.top-110):rect.bottom+8}px`;}}><MoreVertical size={17}/></button><div id={`user-actions-${user.id}`} popover="auto" className="users-action-popover" aria-label={`จัดการบัญชี ${user.name}`} onClick={event=>{if((event.target as HTMLElement).closest("button"))event.currentTarget.hidePopover();}}><button type="button" onClick={()=>open("password",user)}><KeyRound size={16}/>เปลี่ยนรหัสผ่าน</button><button type="button" className="danger" disabled={busy} onClick={()=>void remove(user)}><Trash2 size={16}/>ลบบัญชี</button></div></div>;
  }
  return (<main className="admin-content um-page users-management">
    <ManagementPageHeader title="จัดการผู้ใช้งาน" description="จัดการข้อมูลผู้ใช้ แยกตามประเภทผู้ใช้งาน พร้อมดูรายละเอียดและสิทธิ์การเข้าถึงระบบ"/>
    <ManagementSummary variant="users" items={[{label:"ผู้ใช้งานทั้งหมด",value:users.length,unit:"บัญชี",icon:Users,trend:accountTrend(users)},{label:"นักเรียน",value:users.filter(u=>u.role==="student").length,unit:"บัญชี",icon:GraduationCap,tone:"green",trend:accountTrend(users.filter(u=>u.role==="student"))},{label:"ครู",value:users.filter(u=>u.role==="teacher").length,unit:"บัญชี",icon:UserRound,trend:accountTrend(users.filter(u=>u.role==="teacher"))},{label:"ผู้ดูแลระบบ",value:users.filter(u=>u.role==="admin").length,unit:"บัญชี",icon:Crown,tone:"purple",trend:accountTrend(users.filter(u=>u.role==="admin"))}]}/>
    <section className="um-panel users-roster" aria-label="รายชื่อผู้ใช้งาน">
      <AccountPresenceNotice isStale={isStale} onRetry={refreshPresence}/>
      <div className="users-roster-top">
        <div className="users-category-tabs" role="group" aria-label="ประเภทผู้ใช้งาน">{([{value:"",label:"ทั้งหมด"},{value:"teacher",label:"ครู"},{value:"student",label:"นักเรียน"}] as const).map(tab=><button type="button" key={tab.value} aria-pressed={role===tab.value} onClick={()=>changeRole(tab.value)}>{tab.label} <span>({users.filter(u=>!tab.value||u.role===tab.value).length})</span></button>)}</div>
        <div className="um-tools">
          <button type="button" className="um-secondary" disabled={!filtered.length} onClick={exportUsers}><Download size={16}/>{selectedUsers.length?`ส่งออกที่เลือก (${selectedUsers.length})`:"ส่งออกข้อมูล"}</button>
          <div className="users-add-menu"><button type="button" className="um-primary" popoverTarget="users-create-menu" onClick={event=>{const menu=document.getElementById("users-create-menu");if(!menu)return;const rect=event.currentTarget.getBoundingClientRect();menu.style.left=`${Math.max(8,Math.min(rect.right-208,window.innerWidth-216))}px`;menu.style.top=`${rect.bottom+8}px`;}}><Plus size={18}/>เพิ่มผู้ใช้งาน<ChevronDown size={15}/></button><div id="users-create-menu" popover="auto" className="users-action-popover users-create-popover" aria-label="เพิ่มบัญชีผู้ใช้">{(["student","teacher","admin"] as const).map(nextRole=><button type="button" key={nextRole} onClick={event=>{createUser(nextRole);event.currentTarget.parentElement?.hidePopover();}}>เพิ่ม{roleNames[nextRole]}</button>)}</div></div>
          <div className="users-view-switch" role="group" aria-label="รูปแบบรายชื่อ"><button type="button" aria-label="แสดงแบบตาราง" aria-pressed={view==="list"} onClick={()=>setView("list")}><List size={18}/></button><button type="button" aria-label="แสดงแบบการ์ด" aria-pressed={view==="grid"} onClick={()=>setView("grid")}><LayoutGrid size={18}/></button></div>
        </div>
      </div>
      <div className="users-content-filters"><label className="um-search"><Search size={18}/><input aria-label="ค้นหาผู้ใช้งาน" placeholder="ค้นหาชื่อ รหัสนักเรียน/ครู หรืออีเมล..." value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><label><span>ประเภทผู้ใช้</span><select aria-label="ประเภทผู้ใช้งาน" value={role} onChange={e=>changeRole(e.target.value as UserRole|"")}><option value="">ทั้งหมด</option><option value="admin">ผู้ดูแลระบบ</option><option value="teacher">ครู</option><option value="student">นักเรียน</option></select></label><label><span>ระดับชั้น</span><select aria-label="ระดับชั้น" disabled={!studentFiltersAvailable} value={grade} onChange={e=>{setGrade(e.target.value);setClassroom("");setPage(1);}}><option value="">ทุกระดับชั้น</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></label><label><span>ห้องเรียน</span><select aria-label="ห้องเรียน" disabled={!studentFiltersAvailable} value={classroom} onChange={e=>{setClassroom(e.target.value);setPage(1);}}><option value="">ทุกห้องเรียน</option>{classrooms.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><span>สถานะ</span><select aria-label="สถานะการเข้าสู่ระบบ" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">ทุกสถานะ</option><option value="ONLINE">กำลังใช้งาน</option><option value="OFFLINE">ออกจากระบบแล้ว</option></select></label><button type="button" className="um-secondary" onClick={()=>{setQuery("");changeRole("");setStatus("");setGrade("");setClassroom("");setChecked(new Set());}}><SlidersHorizontal size={16}/>ล้างตัวกรอง</button></div>
      {selectedUsers.length>0&&<div className="users-selection" role="status">เลือก {selectedUsers.length} บัญชีในผลลัพธ์นี้<button type="button" onClick={()=>setChecked(new Set())}>ยกเลิกการเลือก</button></div>}
      {!filtered.length?<ManagementEmpty title="ไม่พบผู้ใช้งาน"/>:view==="list"?<div className="um-table-wrap"><table className="um-table users-data"><thead><tr><th><input type="checkbox" aria-label="เลือกผู้ใช้ทั้งหมดในหน้านี้" checked={visibleUsers.length>0&&visibleUsers.every(u=>checked.has(u.id))} onChange={togglePage}/></th><th>#</th><th>รูป</th><th>ชื่อ-นามสกุล</th><th>รหัสผู้ใช้ / อีเมล</th><th>ประเภท</th><th>ระดับชั้น/ห้อง</th><th>การเข้าสู่ระบบ</th><th>วันที่สร้าง</th><th>จัดการ</th></tr></thead><tbody>{visibleUsers.map((user,index)=><tr key={user.id}><td><input type="checkbox" aria-label={`เลือก ${user.name}`} checked={checked.has(user.id)} onChange={()=>toggleUser(user.id)}/></td><td>{pageStart+index}</td><td><ProfileAvatar reference={user.id} name={user.name} hasImage={user.hasProfileImage} className={`users-avatar ${user.role}`}/></td><td><div className="users-name"><strong>{user.name}</strong><small>{roleNames[user.role]}</small></div></td><td><div className="users-code"><strong>{user.code||user.id}</strong><small>{user.email}</small></div></td><td><span className={`users-role ${user.role}`}>{roleNames[user.role]}</span></td><td>{user.role==="student"?(user.className||"ยังไม่ระบุ"):"—"}</td><td><AccountPresenceBadge isLoggedIn={Boolean(user.isLoggedIn)}/></td><td className="users-date"><span>{displayDate(user.createdAt)}</span><small>{user.createdAt?new Date(user.createdAt.replace(" ","T")).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"}):""}</small></td><td>{actions(user)}</td></tr>)}</tbody></table></div>:<div className="users-card-grid">{visibleUsers.map(user=><article className="users-person-card" key={user.id}><div><input type="checkbox" aria-label={`เลือก ${user.name}`} checked={checked.has(user.id)} onChange={()=>toggleUser(user.id)}/><AccountPresenceBadge isLoggedIn={Boolean(user.isLoggedIn)}/></div><PersonCell initials={user.name.slice(0,2)} name={user.name} detail={user.email}/><p>{user.code||user.id} · <span className={`users-role ${user.role}`}>{roleNames[user.role]}</span></p><footer>{actions(user)}</footer></article>)}</div>}
      <ManagementPagination page={currentPage} pageSize={pageSize} total={filtered.length} onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1);}} label="บัญชี"/>
    </section>
      {modal && (
        <div
          className="subject-modal-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="subject-modal user-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-modal-title"
          >
            <header>
              <div>
                <h2 id="user-modal-title">{modalTitle}</h2>
                <p>
                  {selected
                    ? `${selected.name} · ${selected.email}`
                    : "สร้างบัญชีสำหรับเข้าใช้งานระบบ"}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
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
                  <label className="subject-field subject-wide">
                    <span>
                      รหัสผ่านใหม่ <b>*</b>
                    </span>
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
                    {errors.password && <small>{errors.password}</small>}
                  </label>
                </div>
              ) : (
                <div className="subject-form-grid">
                  <label className="subject-field">
                    <span>
                      ชื่อ-สกุล <b>*</b>
                    </span>
                    <input
                      value={value.name}
                      disabled={readOnly}
                      onChange={(event) =>
                        setValue({ ...value, name: event.target.value })
                      }
                    />
                    {errors.name && <small>{errors.name}</small>}
                  </label>
                  <label className="subject-field">
                    <span>
                      อีเมล <b>*</b>
                    </span>
                    <input
                      type="email"
                      value={value.email}
                      disabled={readOnly}
                      onChange={(event) =>
                        setValue({ ...value, email: event.target.value })
                      }
                    />
                    {errors.email && <small>{errors.email}</small>}
                  </label>
                  <label className="subject-field">
                    <span>
                      บทบาท <b>*</b>
                    </span>
                    <select
                      value={value.role}
                      disabled={readOnly}
                      onChange={(event) =>
                        setValue({
                          ...value,
                          role: event.target.value as UserRole,
                          code:
                            event.target.value === "admin" ? "" : value.code,
                        })
                      }
                    >
                      <option value="admin">Admin</option>
                      <option value="teacher">Teacher</option>
                      <option value="student">Student</option>
                    </select>
                  </label>
                  <label className="subject-field">
                    <span>
                      สถานะบัญชี <b>*</b>
                    </span>
                    <select
                      value={value.status}
                      disabled={readOnly}
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
                  </label>
                  {value.role !== "admin" && (
                    <label className="subject-field">
                      <span>
                        {value.role === "teacher" ? "รหัสครู" : "รหัสนักเรียน"}{" "}
                        <b>*</b>
                      </span>
                      <input
                        value={value.code}
                        disabled={readOnly}
                        onChange={(event) =>
                          setValue({ ...value, code: event.target.value })
                        }
                      />
                      {errors.code && <small>{errors.code}</small>}
                    </label>
                  )}
                  {modal === "create" && (
                    <label className="subject-field">
                      <span>
                        รหัสผ่าน <b>*</b>
                      </span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={value.password}
                        onChange={(event) =>
                          setValue({ ...value, password: event.target.value })
                        }
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                      />
                      {errors.password && <small>{errors.password}</small>}
                    </label>
                  )}
                </div>
              )}
              <div className="subject-modal-footer">
                <button
                  type="button"
                  className="admin-button secondary"
                  onClick={() => setModal(null)}
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
