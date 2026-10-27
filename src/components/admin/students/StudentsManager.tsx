"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  Download,
  Ellipsis,
  Eye,
  GraduationCap,
  Layers3,
  Pencil,
  Save,
  School,
  Search,
  Trash2,
  Clock3,
  Users,
  X,
} from "lucide-react";
import styles from "./StudentRoster.module.css";
import { ProfileAvatar } from "@/components/admin/users/ProfileAvatar";
import {
  AccountPresenceBadge,
  AccountPresenceNotice,
  loginStatusLabel,
  useAccountPresence,
} from "../users/AccountPresence";
import {
  ManagementEmpty,
  ManagementPageHeader,
  ManagementPagination,
  ManagementSummary,
  exportManagementCsv,
} from "../users/UserManagementUI";
import { confirmDanger, showActionSuccess } from "@/lib/sweet-alert";
import StudentAddDropdown from "./StudentAddDropdown";
import {
  EMPTY_STUDENT,
  type ClassroomOption,
  type StudentAccountOption,
  type StudentFormValue,
  type StudentRecord,
} from "./types";
import StudentTermEnrollmentModal from "./StudentTermEnrollmentModal";

type Mode = "create" | "view" | "edit";
type Errors = Partial<Record<keyof StudentFormValue, string>>;
type SortOption = "code-asc" | "code-desc" | "name-asc" | "name-desc" | "number-asc" | "number-desc";
const STANDARD_GRADE_LEVELS = ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"];

export default function StudentsManager({
  initialStudents,
  initialAvailableStudents,
  classrooms,
  latestAccess,
  academicYear,
  semester,
  academicYears,
}: {
  initialStudents: StudentRecord[];
  initialAvailableStudents: StudentAccountOption[];
  classrooms: ClassroomOption[];
  latestAccess?: string | null;
  academicYear: string;
  semester: "1" | "2";
  academicYears: string[];
}) {
  const [studentRecords, setStudentRecords] = useState(initialStudents);
  const [availableStudents, setAvailableStudents] = useState(initialAvailableStudents);
  const [termYear, setTermYear] = useState(academicYear);
  const [termSemester, setTermSemester] = useState<"1" | "2">(semester);
  const [termYears, setTermYears] = useState(academicYears);
  const [enrollExistingOpen, setEnrollExistingOpen] = useState(false);
  const {
    accounts: students,
    isStale,
    refresh: refreshPresence,
  } = useAccountPresence(studentRecords, "student");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState(classrooms[0]?.level || "");
  const [room, setRoom] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("code-asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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
  const studentsRef = useRef(students);

  const collator = useMemo(
    () => new Intl.Collator("th", { numeric: true, sensitivity: "base" }),
    [],
  );
  const configuredLevels = useMemo(
    () =>
      [...new Set(classrooms.map((item) => item.level).filter(Boolean))].sort(
        (a, b) => collator.compare(a, b),
      ),
    [classrooms, collator],
  );
  const gradeOptions = useMemo(
    () =>
      [...new Set([...STANDARD_GRADE_LEVELS, ...configuredLevels])].sort(
        (a, b) => collator.compare(a, b),
      ),
    [configuredLevels, collator],
  );
  const filteredStudents = useMemo(() => {
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
        (!room || (room === "unassigned" ? !student.classId || !classrooms.some((classroom) => classroom.id === student.classId) : String(student.classId) === room)) &&
        (!statusFilter ||
          (statusFilter === "ONLINE"
            ? Boolean(student.isLoggedIn)
            : !Boolean(student.isLoggedIn)))
      );
    });
  }, [students, classrooms, query, level, room, statusFilter]);
  const sortedStudents = useMemo(() => {
    const direction = sort.endsWith("desc") ? -1 : 1;
    const compare = (a: StudentRecord, b: StudentRecord) => {
      if (sort.startsWith("name")) {
        return direction * collator.compare(a.fullName, b.fullName);
      }
      if (sort.startsWith("number")) {
        const numberDifference =
          (a.classNumber ?? Number.MAX_SAFE_INTEGER) -
          (b.classNumber ?? Number.MAX_SAFE_INTEGER);
        return direction * (numberDifference || collator.compare(a.studentCode, b.studentCode));
      }
      return direction * collator.compare(a.studentCode, b.studentCode);
    };
    return [...filteredStudents].sort(compare);
  }, [filteredStudents, sort, collator]);
  const totalPages = Math.max(1, Math.ceil(sortedStudents.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStudents = sortedStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageSelected = pageStudents.length > 0 && pageStudents.every((student) => selectedIds.has(student.databaseId));
  const scopedSelectedStudents = sortedStudents.filter((student) =>
    selectedIds.has(student.databaseId),
  );
  const accessDate = latestAccess ? new Date(latestAccess.replace(" ", "T")) : null;
  const validAccess = accessDate && Number.isFinite(accessDate.getTime()) ? accessDate : null;
  const unassignedCount = students.filter(
    (student) =>
      !student.classId ||
      !classrooms.some((classroom) => classroom.id === student.classId),
  ).length;
  const selectedRoom = classrooms.find((item) => String(item.id) === room);
  const roomOptions = classrooms.filter((item) => !level || item.level === level);
  const roomTitle =
    room === "unassigned"
      ? "นักเรียนที่ยังไม่กำหนดชั้น/ห้อง"
      : selectedRoom
        ? "รายชื่อนักเรียน " + selectedRoom.name
        : level
          ? "รายชื่อนักเรียน " + level
          : "รายชื่อนักเรียนทั้งหมด";

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    function syncFromLocation() {
      const params = new URLSearchParams(window.location.search);
      if (params.get("class") === "unassigned") {
        setLevel("");
        setRoom("unassigned");
        setPage(1);
        return;
      }
      if (params.get("level") === "all" && !params.has("class")) {
        setLevel("");
        setRoom("");
        setPage(1);
        return;
      }
      const selectedClassId = Number(params.get("class"));
      const selectedClass = classrooms.find((item) => item.id === selectedClassId);
      const requestedLevel = params.get("level") || selectedClass?.level || "";
      const nextLevel = gradeOptions.includes(requestedLevel)
        ? requestedLevel
        : selectedClass?.level || configuredLevels[0] || gradeOptions[0] || "";
      const nextRoom =
        selectedClass && selectedClass.level === nextLevel
          ? String(selectedClass.id)
          : "";
      setLevel(nextLevel);
      setRoom(nextRoom);
      setPage(1);
    }
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [classrooms, configuredLevels, gradeOptions]);

  function notify(message: string, tone: "success" | "error") {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3500);
  }

  function open(
    nextMode: Mode,
    student: StudentRecord | null = null,
    syncLocation = true,
  ) {
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
    if (syncLocation) {
      const params = new URLSearchParams(window.location.search);
      if (nextMode === "create") {
        params.delete("student");
        params.set("mode", "create");
      } else if (student) {
        params.set("student", String(student.databaseId));
        params.set("mode", nextMode);
      }
      const search = params.toString();
      const state =
        window.history.state && typeof window.history.state === "object"
          ? window.history.state
          : {};
      window.history.pushState(
        { ...state, __studentManagementModal: true },
        "",
        window.location.pathname +
          (search ? "?" + search : "") +
          window.location.hash,
      );
    }
  }

  useEffect(() => {
    function syncModalFromLocation() {
      const params = new URLSearchParams(window.location.search);
      const requestedMode = params.get("mode");
      if (requestedMode === "create") {
        open("create", null, false);
        return;
      }
      const studentId = Number(params.get("student"));
      const student = studentsRef.current.find(
        (item) => item.databaseId === studentId,
      );
      if (student && (requestedMode === "view" || requestedMode === "edit" || !requestedMode)) {
        open(requestedMode === "edit" ? "edit" : "view", student, false);
      } else {
        setMode(null);
        setSelected(null);
      }
    }
    syncModalFromLocation();
    window.addEventListener("popstate", syncModalFromLocation);
    return () => window.removeEventListener("popstate", syncModalFromLocation);
  }, [initialStudents]);

  function closeModal(force = false) {
    if (busy && !force) return;
    setMode(null);
    setSelected(null);
    if (!mode) return;
    if (window.history.state?.__studentManagementModal) {
      window.history.back();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.delete("student");
    params.delete("mode");
    const search = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname +
        (search ? "?" + search : "") +
        window.location.hash,
    );
  }

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
    const response = await fetch(`/api/students?academicYear=${encodeURIComponent(termYear)}&semester=${termSemester}`, { cache: "no-store" });
    const data = (await response.json()) as {
      students?: StudentRecord[];
      availableStudents?: StudentAccountOption[];
      classrooms?: ClassroomOption[];
      academicYears?: string[];
      latestAccess?: string | null;
      message?: string;
    };
    if (!response.ok || !data.students)
      throw new Error(data.message || "โหลดข้อมูลล่าสุดไม่สำเร็จ");
    setStudentRecords(data.students);
    setAvailableStudents(data.availableStudents || []);
    setTermYears(data.academicYears || termYears);
    await refreshPresence();
    setSelectedIds(new Set());
  }

  async function changeTerm(year: string, nextSemester: "1" | "2") {
    setTermYear(year);
    setTermSemester(nextSemester);
    setPage(1);
    setSelectedIds(new Set());
    const params = new URLSearchParams(window.location.search);
    params.set("academicYear", year);
    params.set("semester", nextSemester);
    params.delete("student");
    params.delete("mode");
    window.history.pushState(window.history.state, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
    setMode(null);
    setSelected(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/students?academicYear=${encodeURIComponent(year)}&semester=${nextSemester}`, { cache: "no-store" });
      const data = (await response.json()) as { students?: StudentRecord[]; availableStudents?: StudentAccountOption[]; academicYears?: string[]; message?: string };
      if (!response.ok || !data.students) throw new Error(data.message || "โหลดข้อมูลภาคเรียนไม่สำเร็จ");
      setStudentRecords(data.students);
      setAvailableStudents(data.availableStudents || []);
      setTermYears(data.academicYears || termYears);
      setLevel("");
      setRoom("");
      setQuery("");
      await refreshPresence();
    } catch (error) {
      notify(error instanceof Error ? error.message : "โหลดข้อมูลภาคเรียนไม่สำเร็จ", "error");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!validate()) return;
    setBusy(true);
    setServerError("");
    try {
      const response = await fetch("/api/students", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, id: selected?.databaseId, academicYear: termYear, semester: termSemester }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(data.message || "บันทึกข้อมูลไม่สำเร็จ");
      await reload();
      closeModal(true);
      void showActionSuccess(data.message || "บันทึกข้อมูลสำเร็จ");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setBusy(false);
    }
  }

  async function remove(student: StudentRecord) {
    const confirmed = await confirmDanger({
      title: "นำรายชื่อออกจากภาคเรียน?",
      text: `${student.fullName} จะถูกนำออกจากเทอม ${termSemester}/${termYear} บัญชี อีเมล และข้อมูลใบหน้ายังคงอยู่`,
      confirmText: "นำรายชื่อออก",
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/students?id=${student.databaseId}&academicYear=${encodeURIComponent(termYear)}&semester=${termSemester}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message || "ลบนักเรียนไม่สำเร็จ");
      await reload();
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(student.databaseId);
        return next;
      });
      void showActionSuccess(data.message || "ลบนักเรียนสำเร็จ");
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

  function selectClass(nextLevel: string, nextRoom: string) {
    setLevel(nextLevel);
    setRoom(nextRoom);
    setPage(1);
    const params = new URLSearchParams(window.location.search);
    if (nextLevel) params.set("level", nextLevel);
    else if (nextRoom === "unassigned") params.delete("level");
    else params.set("level", "all");
    if (nextRoom) params.set("class", nextRoom);
    else params.delete("class");
    const search = params.toString();
    window.history.pushState(
      window.history.state,
      "",
      window.location.pathname + (search ? "?" + search : "") + window.location.hash,
    );
  }

  function toggleStudent(id: number, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleCurrentPage(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const student of pageStudents) {
        if (checked) next.add(student.databaseId);
        else next.delete(student.databaseId);
      }
      return next;
    });
  }

  function exportRows() {
    const rows = selectedIds.size ? scopedSelectedStudents : filteredStudents;
    if (!rows.length) return;
    exportManagementCsv(
      "student-roster.csv",
      ["รหัสนักเรียน", "ชื่อ-สกุล", "อีเมล", "ชั้น/ห้อง", "เลขที่", "ผู้ปกครอง", "เบอร์โทร", "สถานะการเข้าสู่ระบบ"],
      rows.map((student) => [
        student.studentCode,
        student.fullName,
        student.email,
        student.className,
        student.classNumber ?? "",
        student.parentName,
        student.phone,
        loginStatusLabel(Boolean(student.isLoggedIn)),
      ]),
    );
  }

  return (
    <main className={"admin-content um-page students-management " + styles.page}>
      <ManagementPageHeader
        title="จัดการนักเรียน"
        description="จัดการข้อมูลนักเรียน แยกตามระดับชั้นและห้องเรียน"
        section="นักเรียน"
      />
      <div className={styles.termControls} aria-label="เลือกภาคเรียนของรายชื่อนักเรียน">
        <span>รายชื่อประจำภาคเรียน</span>
        <label>ปีการศึกษา<select aria-label="ปีการศึกษา" value={termYear} onChange={(event) => void changeTerm(event.target.value, termSemester)} disabled={busy}>
          {[...new Set([termYear, ...termYears])].sort((a, b) => Number(b) - Number(a)).map((year) => <option key={year} value={year}>{year}</option>)}
        </select></label>
        <label>ภาคเรียน<select aria-label="ภาคเรียน" value={termSemester} onChange={(event) => void changeTerm(termYear, event.target.value as "1" | "2")} disabled={busy}>
          <option value="1">ภาคเรียนที่ 1</option><option value="2">ภาคเรียนที่ 2</option>
        </select></label>
      </div>
      <ManagementSummary
        variant="teacher"
        items={[
          { label: "นักเรียนทั้งหมด", value: students.length, unit: "คน", icon: Users, tone: "blue", note: "ทุกสถานะ" },
          { label: "ระดับชั้น", value: configuredLevels.length, unit: "ระดับ", icon: Layers3, tone: "purple", note: "ที่มีห้องเรียนในระบบ" },
          { label: "ห้องเรียน", value: classrooms.length, unit: "ห้อง", icon: School, tone: "amber", note: "ตามทะเบียนห้องเรียน" },
          { label: "เข้าใช้งานล่าสุด", value: validAccess ? validAccess.getDate() : "—", unit: validAccess ? validAccess.toLocaleDateString("th-TH", { month: "short", year: "numeric" }) : "", icon: Clock3, tone: "blue", note: validAccess ? `เวลา ${validAccess.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.` : "ยังไม่มีประวัติเข้าใช้งาน" },
        ]}
      />

      <div className={"um-split " + styles.split}>
        <section className={"um-panel " + styles.classPanel} aria-labelledby="student-classes-heading">
          <header className={"um-panel-heading " + styles.panelHeading}>
            <div className={"um-panel-icon-heading " + styles.panelTitleGroup}>
              <span className={"um-panel-heading-icon " + styles.panelIcon}>
                <Layers3 size={25} aria-hidden="true" />
              </span>
              <div>
                <h2 id="student-classes-heading">เลือกระดับชั้น</h2>
                <p>เลือกชั้นเรียนเพื่อดูห้องทั้งหมด</p>
              </div>
            </div>
            <span className={styles.classCount}>{classrooms.length} ห้อง</span>
          </header>

          <div className={styles.gradeGrid} aria-label="เลือกระดับชั้น">
            {gradeOptions.map((item) => {
              const count = classrooms.filter((classroom) => classroom.level === item).length;
              const active = level === item;
              return (
                <button
                  type="button"
                  key={item}
                  className={styles.gradeButton}
                  aria-pressed={active}
                  onClick={() => selectClass(item, "")}
                >
                  {item}
                  <span>{count} ห้อง</span>
                  {active && (
                    <Check
                      className={styles.gradeCheck}
                      size={13}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className={styles.classroomHeading}>
            <h3>ห้องเรียน{level ? " " + level : "ทั้งหมด"}</h3>
            <span>{roomOptions.length} ห้อง</span>
            {level && (
              <button
                type="button"
                className={styles.allGrades}
                onClick={() => selectClass("", "")}
              >
                ดูทุกระดับชั้น
              </button>
            )}
          </div>
          {roomOptions.length > 0 ? (
            <div className={styles.classroomGrid}>
              {roomOptions.map((classroom) => {
                const count = students.filter((student) => student.classId === classroom.id).length;
                const active = room === String(classroom.id);
                return (
                  <button
                    type="button"
                    key={classroom.id}
                    className={styles.classroomCard}
                    aria-pressed={active}
                    onClick={() =>
                      selectClass(
                        classroom.level,
                        active ? "" : String(classroom.id),
                      )
                    }
                  >
                    <span className={styles.classroomIcon}>
                      <Users size={18} aria-hidden="true" />
                    </span>
                    <span className={styles.classroomDetails}>
                      <strong>{classroom.name}</strong>
                      <small>นักเรียน {count} คน</small>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ) : (
            <ManagementEmpty
              title={level ? `ยังไม่มีห้องเรียนระดับ ${level}` : "ยังไม่มีห้องเรียนในระบบ"}
              description={
                level
                  ? `ยังไม่มีห้องเรียนที่ลงทะเบียนไว้ในระดับ ${level}`
                  : "เพิ่มห้องเรียนในระบบเพื่อเริ่มจัดการรายชื่อนักเรียน"
              }
            />
          )}
          {unassignedCount > 0 && (
            <button
              type="button"
              className={styles.classroomCard + " " + styles.unassignedCard}
              aria-pressed={room === "unassigned"}
              onClick={() => selectClass("", "unassigned")}
            >
              <span className={styles.classroomIcon}>
                <GraduationCap size={18} aria-hidden="true" />
              </span>
              <span className={styles.classroomDetails}>
                <strong>ยังไม่กำหนดชั้น/ห้อง</strong>
                <small>นักเรียน {unassignedCount} คน</small>
              </span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          )}
        </section>

        <section className={"um-panel " + styles.rosterPanel} aria-labelledby="student-roster-heading">
          <header className={"um-panel-heading " + styles.rosterHeading}>
            <div className={"um-panel-icon-heading " + styles.panelTitleGroup}>
              <span className={"um-panel-heading-icon " + styles.panelIcon}>
                <Users size={23} aria-hidden="true" />
              </span>
              <div>
                <h2 id="student-roster-heading">{roomTitle}</h2>
                <p>พบ {filteredStudents.length} คนตามตัวกรองปัจจุบัน</p>
              </div>
            </div>
            <div className={"um-tools " + styles.panelActions}>
              <button
                type="button"
                className="um-secondary"
                onClick={exportRows}
                disabled={
                  selectedIds.size
                    ? !scopedSelectedStudents.length
                    : !filteredStudents.length
                }
              >
                <Download size={16} aria-hidden="true" />
                {selectedIds.size
                  ? "ส่งออกที่เลือก (" + scopedSelectedStudents.length + ")"
                  : "ส่งออกข้อมูล"}
              </button>
              <StudentAddDropdown
                classrooms={classrooms}
                academicYear={termYear}
                semester={termSemester}
                academicYears={termYears}
                onAddSingle={() => open("create")}
                onEnrollExisting={() => setEnrollExistingOpen(true)}
                onImportDone={reload}
              />
            </div>
          </header>

          <div className={"um-tools " + styles.filters}>
            <label className="um-search">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label="ค้นหานักเรียน"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหารหัส ชื่อ อีเมล ผู้ปกครอง หรือเบอร์โทร"
              />
            </label>
            <label className={styles.filterField}>
              <span>สถานะการเข้าสู่ระบบ</span>
              <select
                aria-label="สถานะการเข้าสู่ระบบ"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">ทุกสถานะ</option>
                <option value="ONLINE">กำลังใช้งาน</option>
                <option value="OFFLINE">ออกจากระบบแล้ว</option>
              </select>
            </label>
            <label className={styles.filterField}>
              <span>เรียงตาม</span>
              <select
                aria-label="เรียงรายชื่อนักเรียน"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
              >
                <option value="code-asc">รหัสนักเรียน</option>
                <option value="code-desc">รหัสนักเรียน (มากไปน้อย)</option>
                <option value="name-asc">ชื่อ-สกุล</option>
                <option value="name-desc">ชื่อ-สกุล (ย้อนกลับ)</option>
                <option value="number-asc">เลขที่</option>
                <option value="number-desc">เลขที่ (มากไปน้อย)</option>
              </select>
            </label>
            {(query || statusFilter) && (
              <button
                type="button"
                className="um-secondary"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("");
                  setPage(1);
                }}
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <AccountPresenceNotice
            isStale={isStale}
            onRetry={refreshPresence}
          />

          {selectedIds.size > 0 && (
            <div className={styles.selectionBar} role="status">
              <span>เลือกแล้ว {scopedSelectedStudents.length} คนในรายการนี้</span>
              <button type="button" onClick={() => setSelectedIds(new Set())}>
                ล้างการเลือก
              </button>
            </div>
          )}

          <div className={styles.tableWrap + " um-table-wrap"}>
            <table className={styles.table + " um-table"}>
              <colgroup>
                <col className={styles.checkboxCell} />
                <col className={styles.indexCell} />
                <col className={styles.codeCell} />
                <col />
                <col className={styles.classCell} />
                <col className={styles.presenceCell} />
                <col className={styles.actionsCell} />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      aria-label="เลือกนักเรียนทั้งหมดในหน้านี้"
                      checked={pageSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate =
                            pageStudents.some((student) => selectedIds.has(student.databaseId)) &&
                            !pageSelected;
                        }
                      }}
                      onChange={(event) => toggleCurrentPage(event.target.checked)}
                    />
                  </th>
                  <th className={styles.indexCell}>ลำดับ</th>
                  <th className={styles.codeCell}>รหัสนักเรียน</th>
                  <th>ชื่อ-สกุล</th>
                  <th className={styles.classCell}>ชั้น/ห้อง</th>
                  <th className={styles.presenceCell}>สถานะการเข้าสู่ระบบ</th>
                  <th className={styles.actionsCell}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {pageStudents.map((student, index) => (
                  <tr key={student.databaseId}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        aria-label={"เลือก " + student.fullName}
                        checked={selectedIds.has(student.databaseId)}
                        onChange={(event) =>
                          toggleStudent(student.databaseId, event.target.checked)
                        }
                      />
                    </td>
                    <td className={styles.indexCell}>
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className={styles.codeCell}><b>{student.studentCode}</b></td>
                    <td>
                      <div className={styles.personCell}>
                        <ProfileAvatar
                          reference={`S${student.databaseId}`}
                          name={student.fullName}
                          hasImage={student.hasProfileImage}
                        />
                        <span>
                          <strong title={student.fullName}>{student.fullName}</strong>
                          <small title={student.email}>{student.email}</small>
                        </span>
                      </div>
                    </td>
                    <td className={styles.classCell}>{student.className || "ยังไม่ระบุ"}</td>
                    <td className={styles.presenceCell}>
                      <AccountPresenceBadge
                        isLoggedIn={Boolean(student.isLoggedIn)}
                      />
                    </td>
                    <td className={styles.actionsCell}>
                      <div className="um-actions">
                        <button
                          type="button"
                          className={"um-secondary " + styles.rowAction}
                          title="ดูรายละเอียด"
                          aria-label={"ดูรายละเอียด " + student.fullName}
                          onClick={() => open("view", student)}
                        >
                          <Eye size={16} />
                          ดูข้อมูล
                        </button>
                        <button
                          type="button"
                          className={"um-secondary " + styles.rowAction}
                          title="แก้ไข"
                          aria-label={"แก้ไข " + student.fullName}
                          onClick={() => open("edit", student)}
                        >
                          <Pencil size={16} />
                          แก้ไข
                        </button>
                        <details className={styles.moreMenu}>
                          <summary
                            className="um-icon-button"
                            aria-label={"การดำเนินการเพิ่มเติมสำหรับ " + student.fullName}
                            title="การดำเนินการเพิ่มเติม"
                          >
                            <Ellipsis size={17} />
                          </summary>
                          <div className={styles.moreMenuPopup}>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void remove(student)}
                            >
                              <Trash2 size={15} />
                              ลบนักเรียน
                            </button>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
                {!pageStudents.length && (
                  <tr>
                    <td colSpan={7} className={styles.emptyCell}>
                      <ManagementEmpty
                        title="ไม่พบข้อมูลนักเรียน"
                        description="ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูรายชื่อทั้งหมด"
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <ManagementPagination
              page={currentPage}
              pageSize={pageSize}
              total={sortedStudents.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              label="คน"
            />
          </div>
        </section>
      </div>
      {mode && (
        <div
          className="student-modal-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) closeModal();
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
                onClick={() => closeModal()}
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
                  onClick={() => closeModal()}
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
      {enrollExistingOpen && (
        <StudentTermEnrollmentModal
          academicYear={termYear}
          semester={termSemester}
          classrooms={classrooms}
          students={availableStudents}
          onClose={() => setEnrollExistingOpen(false)}
          onSaved={async (message) => {
            await reload();
            setEnrollExistingOpen(false);
            void showActionSuccess(message);
          }}
        />
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
