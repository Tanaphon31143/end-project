import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "./db";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";
export type StudySchedule = { dayOfWeek: number; periodName: string; startTime: string; endTime: string };
export type SubjectRequestInput = {
  subjectName: string;
  subjectCode: string;
  semester: number;
  academicYear: string;
  description: string;
  classroomId: number;
  schedules: StudySchedule[];
};
export type SubjectRequest = SubjectRequestInput & {
  id: number;
  teacherId: number;
  teacherName: string;
  classroomName: string;
  status: RequestStatus;
  adminRemark: string | null;
  subjectId: number | null;
  createdAt: string;
  updatedAt: string;
};

export function parseSubjectRequestInput(value: unknown): SubjectRequestInput {
  if (!value || typeof value !== "object") throw new Error("กรุณากรอกข้อมูลรายวิชาให้ครบถ้วน");
  const data = value as Record<string, unknown>;
  const subjectName = String(data.subjectName ?? "").trim();
  const subjectCode = String(data.subjectCode ?? "").trim().toUpperCase();
  const description = String(data.description ?? "").trim();
  const academicYear = String(data.academicYear ?? "").trim();
  const semester = Number(data.semester);
  const classroomId = Number(data.classroomId);
  if (!subjectName || subjectName.length > 200) throw new Error("กรุณาระบุชื่อรายวิชาไม่เกิน 200 ตัวอักษร");
  if (!/^[\p{L}\p{N}._/-]{2,30}$/u.test(subjectCode)) throw new Error("รหัสวิชาต้องมี 2–30 ตัวอักษรและไม่มีช่องว่าง");
  if (![1, 2, 3].includes(semester)) throw new Error("กรุณาเลือกภาคเรียน");
  if (!/^\d{4}$/.test(academicYear)) throw new Error("ปีการศึกษาต้องเป็นตัวเลข 4 หลัก");
  if (description.length > 255) throw new Error("คำอธิบายต้องไม่เกิน 255 ตัวอักษร");
  if (!Number.isSafeInteger(classroomId) || classroomId < 1) throw new Error("กรุณาเลือกห้องเรียน");
  if (!Array.isArray(data.schedules) || data.schedules.length < 1 || data.schedules.length > 12) throw new Error("กรุณาระบุเวลาเรียนอย่างน้อย 1 คาบและไม่เกิน 12 คาบ");
  const schedules = data.schedules.map((item) => {
    if (!item || typeof item !== "object") throw new Error("ข้อมูลเวลาเรียนไม่ถูกต้อง");
    const schedule = item as Record<string, unknown>;
    const dayOfWeek = Number(schedule.dayOfWeek);
    const periodName = String(schedule.periodName ?? "").trim();
    const startTime = String(schedule.startTime ?? "");
    const endTime = String(schedule.endTime ?? "");
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7 || periodName.length > 50 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime >= endTime) throw new Error("กรุณาตรวจสอบวันและเวลาเรียน");
    return { dayOfWeek, periodName, startTime, endTime };
  });
  for (let i = 0; i < schedules.length; i++) for (let j = i + 1; j < schedules.length; j++) {
    const a = schedules[i], b = schedules[j];
    if (a.dayOfWeek === b.dayOfWeek && a.startTime < b.endTime && b.startTime < a.endTime) throw new Error("เวลาเรียนในวันเดียวกันต้องไม่ซ้อนกัน");
  }
  return { subjectName, subjectCode, semester, academicYear, description, classroomId, schedules };
}

type RequestRow = RowDataPacket & Omit<SubjectRequest, "schedules"> & { schedulesJson: string | StudySchedule[] };

const TRANSIENT_DATABASE_ERRORS = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
]);

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return databaseErrorCode(candidate.cause);
}

async function readRequests(
  sql: string,
  values?: Array<string | number | Date | null>,
): Promise<RequestRow[]> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const [rows] = await db.execute<RequestRow[]>(sql, values);
      return rows;
    } catch (error) {
      const canRetry =
        attempt === 0 &&
        TRANSIENT_DATABASE_ERRORS.has(databaseErrorCode(error) ?? "");

      if (!canRetry) throw error;

      // mysql2 removes the broken socket from its pool. Give it a moment to
      // acquire a fresh connection before retrying this read once.
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
    }
  }

  throw new Error("Unable to load subject requests after retry");
}

const columns = `r.id, r.teacher_id teacherId, t.full_name teacherName, r.classroom_id classroomId,
  c.name classroomName, r.subject_name subjectName, r.subject_code subjectCode,
  r.semester, r.academic_year academicYear, r.description, r.schedules_json schedulesJson,
  r.status, r.admin_remark adminRemark, r.subject_id subjectId,
  DATE_FORMAT(r.created_at, '%d/%m/%Y %H:%i') createdAt,
  DATE_FORMAT(r.updated_at, '%d/%m/%Y %H:%i') updatedAt`;
function mapRow(row: RequestRow): SubjectRequest {
  const { schedulesJson, ...rest } = row;
  return { ...rest, description: row.description || "", id: Number(row.id), teacherId: Number(row.teacherId), classroomId: Number(row.classroomId), subjectId: row.subjectId === null ? null : Number(row.subjectId), schedules: typeof schedulesJson === "string" ? JSON.parse(schedulesJson) : schedulesJson };
}
export async function getTeacherSubjectRequests(teacherId: number): Promise<SubjectRequest[]> {
  const rows = await readRequests(
    `SELECT ${columns} FROM teacher_subject_requests r JOIN teachers t ON t.id=r.teacher_id JOIN classrooms c ON c.id=r.classroom_id WHERE r.teacher_id=? ORDER BY r.updated_at DESC, r.id DESC LIMIT 100`,
    [teacherId],
  );
  return rows.map(mapRow);
}
export async function getAdminSubjectRequests(): Promise<SubjectRequest[]> {
  const rows = await readRequests(
    `SELECT ${columns} FROM teacher_subject_requests r JOIN teachers t ON t.id=r.teacher_id JOIN classrooms c ON c.id=r.classroom_id ORDER BY (r.status='PENDING') DESC, r.updated_at DESC, r.id DESC LIMIT 200`,
  );
  return rows.map(mapRow);
}
