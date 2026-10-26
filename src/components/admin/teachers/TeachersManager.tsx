"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  BookOpen,
  BookText,
  BriefcaseBusiness,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Download,
  Dumbbell,
  Eye,
  FlaskConical,
  Globe,
  GraduationCap,
  KeyRound,
  MoreHorizontal,
  MoreVertical,
  Palette,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import { ProfileAvatar } from "@/components/admin/users/ProfileAvatar";
import {
  AccountPresenceBadge,
  AccountPresenceNotice,
  loginStatusLabel,
  useAccountPresence,
} from "../users/AccountPresence";
import {
  exportManagementCsv,
  ManagementEmpty,
  ManagementPageHeader,
  ManagementPagination,
  ManagementSummary,
} from "@/components/admin/users/UserManagementUI";
import { confirmDanger, showActionSuccess } from "@/lib/sweet-alert";
import {
  EMPTY_TEACHER,
  type TeacherFormValue,
  type TeacherRecord,
  type TeacherSubjectOption,
} from "./types";

type Mode = "create" | "view" | "edit" | "password";
type Errors = Partial<Record<keyof TeacherFormValue, string>>;
const UNASSIGNED_DEPARTMENT = "__unassigned_department__";

const STANDARD_DEPARTMENTS: {
  name: string;
  matches: string[];
  icon: LucideIcon;
  tone: string;
}[] = [
  { name: "ภาษาไทย", matches: ["ภาษาไทย"], icon: BookText, tone: "violet" },
  { name: "คณิตศาสตร์", matches: ["คณิตศาสตร์"], icon: Calculator, tone: "blue" },
  {
    name: "วิทยาศาสตร์และเทคโนโลยี",
    matches: ["วิทยาศาสตร์และเทคโนโลยี", "วิทยาศาสตร์"],
    icon: FlaskConical,
    tone: "amber",
  },
  {
    name: "สังคมศึกษา ศาสนา และวัฒนธรรม",
    matches: ["สังคมศึกษา ศาสนา และวัฒนธรรม", "สังคมศึกษา"],
    icon: GraduationCap,
    tone: "rose",
  },
  {
    name: "ภาษาต่างประเทศ",
    matches: ["ภาษาต่างประเทศ", "ภาษาอังกฤษ"],
    icon: Globe,
    tone: "orange",
  },
  {
    name: "การงานอาชีพและเทคโนโลยี",
    matches: ["การงานอาชีพและเทคโนโลยี", "การงานอาชีพ"],
    icon: BriefcaseBusiness,
    tone: "green",
  },
  { name: "ศิลปะ", matches: ["ศิลปะ"], icon: Palette, tone: "red" },
  {
    name: "สุขศึกษาและพลศึกษา",
    matches: ["สุขศึกษาและพลศึกษา", "สุขศึกษา", "พลศึกษา"],
    icon: Dumbbell,
    tone: "cyan",
  },
];

function normalizeDepartmentName(name: string) {
  return name.trim().replace(/\s+/g, "").toLocaleLowerCase("th");
}

function belongsToStandardDepartment(
  name: string,
  group: (typeof STANDARD_DEPARTMENTS)[number],
) {
  const normalized = normalizeDepartmentName(name);
  return group.matches.some(
    (candidate) => normalizeDepartmentName(candidate) === normalized,
  );
}

export default function TeachersManager({
  initialTeachers,
  initialSubjects,
}: {
  initialTeachers: TeacherRecord[];
  initialSubjects: TeacherSubjectOption[];
}) {
  const [teacherRecords, setTeachers] = useState(initialTeachers),
    [subjects, setSubjects] = useState(initialSubjects),
    [query, setQuery] = useState(""),
    [department, setDepartment] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set()),
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
  const { accounts: teachers, isStale, refresh: refreshPresence } =
    useAccountPresence(teacherRecords, "teacher");
  const departments = useMemo(() => {
    const names = [
      ...new Set(teachers.map((teacher) => teacher.department.trim()).filter(Boolean)),
    ];
    return names
      .filter(
        (name) =>
          !STANDARD_DEPARTMENTS.some((group) =>
            belongsToStandardDepartment(name, group),
          ),
      )
      .sort((a, b) => a.localeCompare(b, "th"))
      .map((name) => ({
        name,
        count: teachers.filter((teacher) => teacher.department.trim() === name)
          .length,
      }));
  }, [teachers]);
  const standardDepartmentCounts = useMemo(
    () =>
      STANDARD_DEPARTMENTS.map((group) => ({
        ...group,
        count: teachers.filter((teacher) =>
          belongsToStandardDepartment(teacher.department, group),
        ).length,
      })),
    [teachers],
  );
  const unassignedDepartmentCount = useMemo(
    () => teachers.filter((teacher) => !teacher.department.trim()).length,
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
        (!department ||
          (department === UNASSIGNED_DEPARTMENT
            ? !teacher.department.trim()
            : (() => {
                const standard = STANDARD_DEPARTMENTS.find(
                  (group) => group.name === department,
                );
                return standard
                  ? belongsToStandardDepartment(teacher.department, standard)
                  : teacher.department.trim() === department;
              })())) &&
        (!status ||
          (status === "ONLINE"
            ? Boolean(teacher.isLoggedIn)
            : !Boolean(teacher.isLoggedIn))),
    );
  }, [teachers, query, department, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleTeachers = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const visibleIds = visibleTeachers.map((teacher) => teacher.databaseId);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const selectedTeachers = filtered.filter((teacher) =>
    selectedIds.has(teacher.databaseId),
  );
  const exportTeachers = selectedTeachers.length
    ? selectedTeachers
    : selectedIds.size
      ? []
      : filtered;
  const activeCount = teachers.filter((teacher) => Boolean(teacher.isLoggedIn)).length;
  const inactiveCount = teachers.length - activeCount;
  const departmentCount = STANDARD_DEPARTMENTS.length + departments.length;

  function clearFilters() {
    setQuery("");
    setDepartment("");
    setStatus("");
    setPage(1);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

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
    await refreshPresence();
  }
  async function save() {
    if (!validate()) return;
    const reassigned = subjects.filter(
      (subject) =>
        value.subjectIds.includes(subject.id) &&
        subject.teacherId &&
        subject.teacherId !== selected?.databaseId,
    );
    if (reassigned.length) {
      const confirmed = await confirmDanger({
        title: "เปลี่ยนครูผู้สอน?",
        text: `มี ${reassigned.length} รายวิชาที่มีครูผู้สอนอยู่แล้ว ระบบจะเปลี่ยนเป็น ${value.fullName.trim()}`,
        confirmText: "ยืนยันการเปลี่ยน",
      });
      if (!confirmed) return;
    }
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
      void showActionSuccess(data.message || "บันทึกข้อมูลสำเร็จ");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }
  async function remove(teacher: TeacherRecord) {
    const confirmed = await confirmDanger({
      title: "ลบข้อมูลครู?",
      text: `ข้อมูลของ ${teacher.fullName} จะถูกนำออกจากระบบ`,
      confirmText: "ลบข้อมูลครู",
    });
    if (!confirmed) return;
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
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(teacher.databaseId);
        return next;
      });
      void showActionSuccess(data.message || "ลบข้อมูลครูสำเร็จ");
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

  function toggleTeacherSelection(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleVisibleSelection() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function exportTeachersCsv() {
    exportManagementCsv(
      "teachers.csv",
      ["รหัสครู", "ชื่อ-นามสกุล", "อีเมล", "กลุ่มสาระ", "สถานะการเข้าสู่ระบบ", "เบอร์โทรศัพท์", "รายวิชา", "ห้องที่ปรึกษา"],
      exportTeachers.map((teacher) => [
        teacher.teacherCode,
        teacher.fullName,
        teacher.email,
        teacher.department,
        loginStatusLabel(Boolean(teacher.isLoggedIn)),
        teacher.phone,
        teacher.subjectNames.join(", "),
        teacher.advisorRooms.join(", "),
      ]),
    );
  }

  const readOnly = mode === "view",
    passwordOnly = mode === "password";
  return (
    <main className="admin-content um-page teacher-management">
      <ManagementPageHeader
        title="จัดการครู"
        description="จัดการข้อมูลครู แยกตามกลุ่มสาระและตรวจสอบสถานะการเข้าสู่ระบบ"
        section="ครู"
      />
      <ManagementSummary
        variant="teacher"
        items={[
          { label: "ครูทั้งหมด", value: teachers.length, unit: "คน", icon: Users, tone: "blue" },
          { label: "กลุ่มสาระการเรียนรู้", value: departmentCount, unit: "กลุ่ม", icon: BookOpen, tone: "purple" },
          { label: "กำลังใช้งาน", value: activeCount, unit: "คน", icon: UserRound, tone: "green", ratio: teachers.length ? activeCount / teachers.length : 0 },
          { label: "ออกจากระบบแล้ว", value: inactiveCount, unit: "คน", icon: UserX, tone: "rose", ratio: teachers.length ? inactiveCount / teachers.length : 0 },
        ]}
      />
      <div className="um-split teacher-management__grid">
        <aside className="um-panel teacher-management__groups" aria-label="ตัวกรองกลุ่มสาระ">
          <div className="um-panel-heading">
            <div className="um-panel-icon-heading">
              <span className="um-panel-heading-icon"><BookOpen size={21} aria-hidden="true" /></span>
              <div>
              <h2>กลุ่มสาระการเรียนรู้</h2>
              <p>เลือกกลุ่มเพื่อกรองรายชื่อครู</p>
              </div>
            </div>
            <button type="button" className="teacher-groups-all" onClick={() => { setDepartment(""); setPage(1); }} aria-label="แสดงครูทุกกลุ่มสาระ">
              ทั้งหมด <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="teacher-group-list">
            <button
              type="button"
              className={`teacher-group-option ${department === "" ? "selected" : ""}`}
              aria-pressed={department === ""}
              onClick={() => { setDepartment(""); setPage(1); }}
            >
              <span className="teacher-group-icon" data-tone="all"><Users size={18} /></span>
              <span className="teacher-group-name">ทั้งหมด</span>
              <span className="teacher-group-count">{teachers.length}</span>
            </button>
            {standardDepartmentCounts.map(({ name, count, icon: GroupIcon, tone }) => (
              <button
                type="button"
                key={name}
                className={`teacher-group-option ${department === name ? "selected" : ""}`}
                aria-pressed={department === name}
                onClick={() => { setDepartment(name); setPage(1); }}
              >
                <span className="teacher-group-icon" data-tone={tone}><GroupIcon size={18} /></span>
                <span className="teacher-group-name" title={name}>{name}</span>
                <span className="teacher-group-count">{count}</span>
              </button>
            ))}
            {departments.map(({ name, count }) => (
              <button
                type="button"
                key={name}
                className={`teacher-group-option ${department === name ? "selected" : ""}`}
                aria-pressed={department === name}
                onClick={() => { setDepartment(name); setPage(1); }}
              >
                <span className="teacher-group-icon" data-tone="slate"><GraduationCap size={18} /></span>
                <span className="teacher-group-name" title={name}>{name}</span>
                <span className="teacher-group-count">{count}</span>
              </button>
            ))}
            {unassignedDepartmentCount > 0 && (
              <button
                type="button"
                className={`teacher-group-option ${department === UNASSIGNED_DEPARTMENT ? "selected" : ""}`}
                aria-pressed={department === UNASSIGNED_DEPARTMENT}
                onClick={() => { setDepartment(UNASSIGNED_DEPARTMENT); setPage(1); }}
              >
                <span className="teacher-group-icon" data-tone="slate"><BookOpen size={18} /></span>
                <span className="teacher-group-name">ไม่ระบุกลุ่มสาระ</span>
                <span className="teacher-group-count">{unassignedDepartmentCount}</span>
              </button>
            )}
          </div>
        </aside>

        <section className="um-panel teacher-management__table-panel">
          <div className="um-panel-heading">
            <div className="um-panel-icon-heading">
              <span className="um-panel-heading-icon"><Users size={21} aria-hidden="true" /></span>
              <div>
                <h2>รายชื่อครูทั้งหมด</h2>
                <p>แสดงรายชื่อครูในโรงเรียน {teachers.length} คน</p>
              </div>
            </div>
            <div className="teacher-management__panel-actions">
              <details className="teacher-toolbar-more">
                <summary aria-label="ตัวเลือกเพิ่มเติม" title="ตัวเลือกเพิ่มเติม"><MoreHorizontal size={19} /></summary>
                <div className="teacher-toolbar-more__items">
                  <button type="button" onClick={(event) => { clearFilters(); event.currentTarget.closest("details")?.removeAttribute("open"); }}>ล้างตัวกรอง</button>
                  <button type="button" disabled={!selectedIds.size} onClick={(event) => { clearSelection(); event.currentTarget.closest("details")?.removeAttribute("open"); }}>ล้างรายการที่เลือก</button>
                </div>
              </details>
              <button type="button" className="um-secondary" onClick={exportTeachersCsv} disabled={!exportTeachers.length}>
                <Download size={16} />
                ส่งออกข้อมูล{selectedIds.size ? ` (${selectedTeachers.length})` : ""}
              </button>
              <button type="button" className="um-primary" onClick={() => open("create")}>
                <Plus size={17} /> เพิ่มครู
              </button>
            </div>
          </div>
          <div className="um-tools teacher-management__tools">
            <label className="um-search">
              <Search size={18} aria-hidden="true" />
              <input
                aria-label="ค้นหาครู"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                placeholder="ค้นหาชื่อ รหัสครู อีเมล หรือกลุ่มสาระ..."
              />
            </label>
            <select
              className="um-secondary teacher-management__department-filter"
              aria-label="กรองกลุ่มสาระ"
              value={department}
              onChange={(event) => { setDepartment(event.target.value); setPage(1); }}
            >
              <option value="">ทุกกลุ่มสาระ</option>
              {standardDepartmentCounts.map(({ name }) => <option key={name} value={name}>{name}</option>)}
              {departments.map(({ name }) => <option key={name} value={name}>{name}</option>)}
              {unassignedDepartmentCount > 0 && <option value={UNASSIGNED_DEPARTMENT}>ไม่ระบุกลุ่มสาระ</option>}
            </select>
            <select
              className="um-secondary teacher-management__status-filter"
              aria-label="กรองสถานะการเข้าสู่ระบบ"
              value={status}
              onChange={(event) => { setStatus(event.target.value); setPage(1); }}
            >
              <option value="">ทุกสถานะ</option>
              <option value="ONLINE">กำลังใช้งาน</option>
              <option value="OFFLINE">ออกจากระบบแล้ว</option>
            </select>
          </div>
          <AccountPresenceNotice isStale={isStale} onRetry={refreshPresence} />
          <span className="teacher-selection-summary" aria-live="polite">
            {selectedTeachers.length ? `เลือกแล้ว ${selectedTeachers.length} คน · ส่งออกเฉพาะที่เลือก` : "ส่งออกตามผลการค้นหาและตัวกรองปัจจุบัน"}
          </span>
          <div className="um-table-wrap">
            <table className="um-table teacher-management__table">
              <thead>
                <tr>
                  <th className="teacher-management__check-column">
                    <input
                      type="checkbox"
                      aria-label="เลือกครูทั้งหมดในหน้านี้"
                      aria-checked={someVisibleSelected && !allVisibleSelected ? "mixed" : undefined}
                      checked={allVisibleSelected}
                      onChange={toggleVisibleSelection}
                    />
                  </th>
                  <th>#</th>
                  <th>รหัสครู</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>กลุ่มสาระ</th>
                  <th>สถานะการเข้าสู่ระบบ</th>
                  <th>ข้อมูล</th>
                  <th>จัดการ</th>
                  <th aria-label="ตัวเลือกเพิ่มเติม" />
                </tr>
              </thead>
              <tbody>
                {visibleTeachers.map((teacher, index) => (
                  <tr key={teacher.databaseId}>
                    <td className="teacher-management__check-column">
                      <input
                        type="checkbox"
                        aria-label={`เลือก ${teacher.fullName}`}
                        checked={selectedIds.has(teacher.databaseId)}
                        onChange={() => toggleTeacherSelection(teacher.databaseId)}
                      />
                    </td>
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td><b>{teacher.teacherCode}</b></td>
                    <td>
                      <div className="person-cell teacher-person-cell">
                        <ProfileAvatar
                          reference={`T${teacher.databaseId}`}
                          name={teacher.fullName}
                          hasImage={teacher.hasProfileImage}
                          className="teacher-profile-avatar"
                        />
                        <span>
                          <strong>{teacher.fullName}</strong>
                          <small>{teacher.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="teacher-group-pill" data-tone={STANDARD_DEPARTMENTS.find((group) => belongsToStandardDepartment(teacher.department, group))?.tone ?? "slate"}>
                        {teacher.department || "ไม่ระบุกลุ่มสาระ"}
                      </span>
                    </td>
                    <td>
                      <AccountPresenceBadge isLoggedIn={Boolean(teacher.isLoggedIn)} />
                    </td>
                    <td><button type="button" className="teacher-labeled-action" onClick={() => open("view", teacher)} aria-label={`ดูข้อมูล ${teacher.fullName}`}><Eye size={15} /> ดูข้อมูล</button></td>
                    <td><button type="button" className="teacher-labeled-action" onClick={() => open("edit", teacher)} aria-label={`แก้ไข ${teacher.fullName}`}><Pencil size={15} /> แก้ไข</button></td>
                    <td>
                      <details className="teacher-more-menu">
                        <summary aria-label={`การดำเนินการเพิ่มเติมสำหรับ ${teacher.fullName}`} title="เพิ่มเติม"><MoreVertical size={17} /></summary>
                        <div className="teacher-more-menu__items">
                          <button type="button" onClick={() => open("password", teacher)}><KeyRound size={15} /> เปลี่ยนรหัสผ่าน</button>
                          <button type="button" className="danger" disabled={busy} onClick={() => void remove(teacher)}><Trash2 size={15} /> ลบครู</button>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
                {!visibleTeachers.length && (
                  <tr>
                    <td colSpan={9}>
                      <ManagementEmpty title="ไม่พบข้อมูลครู" description={teachers.length ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เมื่อมีข้อมูลครู รายชื่อจะแสดงที่นี่"} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <ManagementPagination
            page={currentPage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => { setPageSize(nextSize); setPage(1); }}
            label="คน"
          />
        </section>
      </div>

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
                      {STANDARD_DEPARTMENTS.map(({ name }) => (
                        <option key={name} value={name} />
                      ))}
                      {departments.map(({ name }) => (
                        <option key={name} value={name} />
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
        <div
          className={`teacher-save-toast ${toast.tone}`}
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {toast.tone === "success" ? (
            <CheckCircle2 aria-hidden="true" size={18} />
          ) : (
            <AlertCircle aria-hidden="true" size={18} />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            aria-label="ปิดข้อความแจ้งเตือน"
            onClick={() => setToast(null)}
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
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
