import "server-only";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import type {
  ClassroomOption,
  SubjectOption,
  SubjectRecord,
} from "@/components/admin/subjects/types";
import type {
  Classroom,
  ClassStudent,
  TeacherOption,
} from "@/components/admin/classes/types";
import type { AdminUserRecord } from "@/components/admin/users/types";
import type {
  ClassroomOption as StudentClassroomOption,
  StudentRecord,
} from "@/components/admin/students/types";
import type {
  TeacherRecord,
  TeacherSubjectOption,
} from "@/components/admin/teachers/types";
import type {
  FaceRecord,
  FaceStudentOption,
} from "@/components/admin/faces/types";
import type {
  CheckInClassroom,
  CheckInSession,
  CheckInSubject,
} from "@/components/admin/check-in/types";
import type {
  AttendancePageData,
  AttendanceRecord,
} from "@/components/admin/attendance/types";
import type {
  ReportData,
  ReportRecord,
} from "@/components/admin/reports/types";

const TRANSIENT_DATABASE_ERRORS = new Set([
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
]);

function databaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;

  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return databaseErrorCode(candidate.cause);
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function rows<T extends RowDataPacket>(sql: string) {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const [result] = await db.execute<T[]>(sql);
      return result;
    } catch (error) {
      const code = databaseErrorCode(error);
      const shouldRetry =
        attempt < maxAttempts &&
        code !== undefined &&
        TRANSIENT_DATABASE_ERRORS.has(code);

      if (!shouldRetry) throw error;

      // The pool discards the broken socket. A short delay lets the retry use
      // a fresh connection without retrying any write operation.
      await wait(150 * attempt);
    }
  }

  throw new Error("Database read failed after retry");
}

export async function getAdminCounts() {
  const result = await rows<
    RowDataPacket & {
      students: number;
      teachers: number;
      subjects: number;
      attendanceToday: number;
    }
  >(
    `SELECT (SELECT COUNT(*) FROM students WHERE status='ACTIVE') students,(SELECT COUNT(*) FROM teachers WHERE status='ACTIVE') teachers,(SELECT COUNT(*) FROM subjects WHERE is_active=1) subjects,(SELECT COUNT(DISTINCT student_id) FROM attendance_records WHERE attendance_date=CURRENT_DATE AND status IN ('PRESENT','LATE')) attendanceToday`,
  );
  return (
    result[0] ?? { students: 0, teachers: 0, subjects: 0, attendanceToday: 0 }
  );
}
export async function getDashboardData() {
  const [counts, recent, dailyRows, attendanceStatus, activity, settings, calendarDates] = await Promise.all([
    getAdminCounts(),
    rows<
      RowDataPacket & {
        id: string;
        name: string;
        room: string;
        time: string;
        status: string;
      }
    >(
      `SELECT st.student_code id,st.full_name name,COALESCE(c.name,'ยังไม่ระบุ') room,COALESCE(TIME_FORMAT(a.check_in_time,'%H:%i'),'-') time,CASE a.status WHEN 'PRESENT' THEN 'มาเรียน' WHEN 'LATE' THEN 'สาย' WHEN 'ABSENT' THEN 'ขาด' ELSE 'ลา' END status FROM attendance_records a JOIN students st ON st.id=a.student_id LEFT JOIN classrooms c ON c.id=st.class_id ORDER BY a.attendance_date DESC,a.check_in_time DESC LIMIT 5`,
    ),
    rows<RowDataPacket & { date: string; students: number; rate: number }>(
      `SELECT DATE_FORMAT(attendance_date,'%Y-%m-%d') date,COUNT(DISTINCT CASE WHEN status IN ('PRESENT','LATE') THEN student_id END) students,ROUND(100*SUM(status IN ('PRESENT','LATE'))/COUNT(*),2) rate FROM attendance_records WHERE attendance_date BETWEEN CURRENT_DATE-INTERVAL 29 DAY AND CURRENT_DATE GROUP BY attendance_date ORDER BY attendance_date`,
    ),
    rows<
      RowDataPacket & {
        present: number;
        late: number;
        absent: number;
        leave: number;
        recorded: number;
      }
    >(
      `SELECT COALESCE(SUM(a.status='PRESENT'),0) present,COALESCE(SUM(a.status='LATE'),0) late,COALESCE(SUM(a.status='ABSENT'),0) absent,COALESCE(SUM(a.status='LEAVE'),0) \`leave\`,COUNT(*) recorded FROM attendance_records a JOIN (SELECT student_id,MAX(id) id FROM attendance_records WHERE attendance_date=CURRENT_DATE GROUP BY student_id) latest ON latest.id=a.id`,
    ),
    rows<
      RowDataPacket & {
        id: string;
        action: string;
        entity: string;
        description: string;
        createdAt: string;
      }
    >(
      `SELECT CAST(log_id AS CHAR) id,action,entity,COALESCE(description,'กิจกรรมในระบบ') description,DATE_FORMAT(created_at,'%d/%m/%Y %H:%i') createdAt FROM audit_logs ORDER BY created_at DESC LIMIT 5`,
    ),
    rows<
      RowDataPacket & {
        schoolName: string;
        semester: number;
        academicYear: string;
      }
    >(
      `SELECT school_name schoolName,semester,academic_year academicYear FROM school_settings ORDER BY id LIMIT 1`,
    ),
    rows<RowDataPacket & { date: string }>(
      `SELECT DISTINCT date FROM (SELECT DATE_FORMAT(attendance_date,'%Y-%m-%d') date FROM attendance_records WHERE attendance_date>=DATE_FORMAT(CURRENT_DATE,'%Y-%m-01') UNION ALL SELECT DATE_FORMAT(created_at,'%Y-%m-%d') date FROM audit_logs WHERE created_at>=DATE_FORMAT(CURRENT_DATE,'%Y-%m-01')) dashboard_dates ORDER BY date`,
    ),
  ]);
  const dailyByDate = new Map(dailyRows.map((row) => [row.date, row]));
  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (29 - index));
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
    const row = dailyByDate.get(key);
    return {
      date: key,
      day: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      students: Number(row?.students ?? 0),
      rate: Number(row?.rate ?? 0),
    };
  });
  if (!settings[0]) {
    throw new Error("ไม่พบการตั้งค่าโรงเรียนในฐานข้อมูล");
  }
  return {
    counts,
    recent,
    daily,
    attendanceStatus: attendanceStatus[0] ?? {
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      recorded: 0,
    },
    activity,
    settings: settings[0],
    calendarDates: calendarDates.map((row) => row.date),
  };
}
export async function getReportData(
  filters: {
    from?: string;
    to?: string;
    classroomId?: number;
    subjectId?: number;
  } = {},
): Promise<ReportData> {
  const conditions = ["1=1"],
    params: (string | number)[] = [];
  if (filters.from) {
    conditions.push("a.attendance_date>=?");
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push("a.attendance_date<=?");
    params.push(filters.to);
  }
  if (filters.classroomId) {
    conditions.push("st.class_id=?");
    params.push(filters.classroomId);
  }
  if (filters.subjectId) {
    conditions.push("a.subject_id=?");
    params.push(filters.subjectId);
  }
  const where = conditions.join(" AND ");
  const [records, classrooms, subjects, studentCount] = await Promise.all([
    db
      .execute<
        (RowDataPacket & ReportRecord)[]
      >(`SELECT DATE_FORMAT(a.attendance_date,'%Y-%m-%d') date,st.student_code studentCode,st.full_name studentName,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(sb.subject_code,'-') subjectCode,COALESCE(sb.subject_name,'ไม่ระบุ') subjectName,COALESCE(TIME_FORMAT(a.check_in_time,'%H:%i'),'-') time,a.status FROM attendance_records a JOIN students st ON st.id=a.student_id LEFT JOIN classrooms c ON c.id=st.class_id LEFT JOIN subjects sb ON sb.id=a.subject_id WHERE ${where} ORDER BY a.attendance_date DESC,a.check_in_time DESC LIMIT 2000`, params)
      .then((x) => x[0]),
    rows<RowDataPacket & { id: number; name: string }>(
      `SELECT id,name FROM classrooms ORDER BY level,name`,
    ),
    rows<RowDataPacket & { id: number; code: string; name: string }>(
      `SELECT id,subject_code code,subject_name name FROM subjects ORDER BY subject_code`,
    ),
    rows<RowDataPacket & { students: number }>(
      `SELECT COUNT(*) students FROM students WHERE status='ACTIVE'`,
    ),
  ]);
  const total = records.length,
    present = records.filter((x) => x.status === "PRESENT").length,
    late = records.filter((x) => x.status === "LATE").length,
    absent = records.filter((x) => x.status === "ABSENT").length,
    leave = records.filter((x) => x.status === "LEAVE").length;
  const map = new Map<string, ReportRecord[]>();
  records.forEach((x) => map.set(x.date, [...(map.get(x.date) || []), x]));
  const daily = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => ({
      day: day.slice(5).split("-").reverse().join("/"),
      students: list.filter(
        (x) => x.status === "PRESENT" || x.status === "LATE",
      ).length,
      rate: list.length
        ? Number(
            (
              (100 *
                list.filter(
                  (x) => x.status === "PRESENT" || x.status === "LATE",
                ).length) /
              list.length
            ).toFixed(2),
          )
        : 0,
    }));
  return {
    summary: {
      students: studentCount[0]?.students || 0,
      total,
      present,
      late,
      absent,
      leave,
      rate: total ? Number(((100 * (present + late)) / total).toFixed(2)) : 0,
    },
    daily,
    records,
    classrooms,
    subjects,
  };
}
export async function getUsers() {
  return rows<RowDataPacket & AdminUserRecord>(
    `SELECT CONCAT('A',id) id,id databaseId,full_name name,email,'admin' role,status,CONCAT('A',LPAD(id,3,'0')) code FROM admins UNION ALL SELECT CONCAT('T',id),id,full_name,email,'teacher',status,COALESCE(teacher_code,CONCAT('T',LPAD(id,3,'0'))) FROM teachers UNION ALL SELECT CONCAT('S',id),id,full_name,email,'student',status,student_code FROM students ORDER BY role,name`,
  );
}
export async function getStudents() {
  return rows<
    RowDataPacket & {
      id: string;
      name: string;
      room: string;
      number: string;
      parent: string;
      phone: string;
    }
  >(
    `SELECT s.student_code id,s.full_name name,COALESCE(c.name,'ยังไม่ระบุ') room,COALESCE(CAST(s.class_number AS CHAR),'-') number,COALESCE(s.parent_name,'-') parent,COALESCE(s.phone,'-') phone FROM students s LEFT JOIN classrooms c ON c.id=s.class_id ORDER BY s.student_code`,
  );
}
export async function getStudentPageData() {
  const [students, classrooms] = await Promise.all([
    rows<RowDataPacket & StudentRecord>(
      `SELECT s.id databaseId,s.student_code studentCode,s.full_name fullName,s.email,s.class_id classId,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(c.level,'') classLevel,s.class_number classNumber,COALESCE(s.parent_name,'') parentName,COALESCE(s.phone,'') phone,s.status FROM students s LEFT JOIN classrooms c ON c.id=s.class_id ORDER BY s.student_code`,
    ),
    rows<RowDataPacket & StudentClassroomOption>(
      `SELECT id,name,level FROM classrooms ORDER BY level,name`,
    ),
  ]);
  return { students, classrooms };
}
export async function getTeachers() {
  return rows<
    RowDataPacket & {
      id: string;
      name: string;
      department: string;
      subjects: string;
      phone: string;
    }
  >(
    `SELECT COALESCE(t.teacher_code,CONCAT('T',LPAD(t.id,3,'0'))) id,t.full_name name,COALESCE(t.department,'-') department,COALESCE(GROUP_CONCAT(DISTINCT s.subject_name ORDER BY s.subject_name SEPARATOR ', '),'-') subjects,COALESCE(t.phone,'-') phone FROM teachers t LEFT JOIN subjects s ON s.teacher_id=t.id GROUP BY t.id ORDER BY t.full_name`,
  );
}
export async function getTeacherPageData() {
  const [teacherRows, subjectRows, advisorRows] = await Promise.all([
    rows<
      RowDataPacket &
        Omit<TeacherRecord, "subjectIds" | "subjectNames" | "advisorRooms">
    >(
      `SELECT id databaseId,COALESCE(teacher_code,CONCAT('T',LPAD(id,3,'0'))) teacherCode,full_name fullName,email,COALESCE(department,'') department,COALESCE(phone,'') phone,status FROM teachers ORDER BY full_name`,
    ),
    rows<RowDataPacket & TeacherSubjectOption>(
      `SELECT s.id,s.subject_code code,s.subject_name name,s.teacher_id teacherId,COALESCE(t.full_name,'ยังไม่กำหนด') teacherName FROM subjects s LEFT JOIN teachers t ON t.id=s.teacher_id ORDER BY s.subject_code`,
    ),
    rows<RowDataPacket & { advisorTeacherId: number; name: string }>(
      `SELECT advisor_teacher_id advisorTeacherId,name FROM classrooms WHERE advisor_teacher_id IS NOT NULL ORDER BY name`,
    ),
  ]);
  const teachers: TeacherRecord[] = teacherRows.map((teacher) => ({
    ...teacher,
    subjectIds: subjectRows
      .filter((subject) => subject.teacherId === teacher.databaseId)
      .map((subject) => subject.id),
    subjectNames: subjectRows
      .filter((subject) => subject.teacherId === teacher.databaseId)
      .map((subject) => `${subject.code} ${subject.name}`),
    advisorRooms: advisorRows
      .filter((room) => room.advisorTeacherId === teacher.databaseId)
      .map((room) => room.name),
  }));
  return { teachers, subjects: subjectRows };
}
export async function getSubjects() {
  return rows<
    RowDataPacket & {
      id: string;
      name: string;
      teacher: string;
      room: string;
      students: string;
    }
  >(
    `SELECT s.subject_code id,s.subject_name name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COALESCE(c.name,'ยังไม่กำหนด') room,CONCAT((SELECT COUNT(*) FROM students st WHERE st.class_id=s.classroom_id),' คน') students FROM subjects s LEFT JOIN teachers t ON t.id=s.teacher_id LEFT JOIN classrooms c ON c.id=s.classroom_id ORDER BY s.subject_code`,
  );
}
export async function getSubjectPageData() {
  type SubjectRow = RowDataPacket & {
    databaseId: number;
    subjectCode: string;
    subjectName: string;
    teacherId: number | null;
    teacherName: string;
    gradeLevel: string | null;
    classId: number | null;
    className: string;
    semester: number;
    academicYear: string;
    credits: string;
    studyDays: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    attendanceMode: "EVERY_PERIOD" | "FIRST_PERIOD";
    isActive: number;
    description: string | null;
    studentCount: number;
  };
  const subjectQuery = `SELECT s.id databaseId,s.subject_code subjectCode,s.subject_name subjectName,s.teacher_id teacherId,COALESCE(t.full_name,'ยังไม่กำหนด') teacherName,s.grade_level gradeLevel,s.classroom_id classId,COALESCE(c.name,'ยังไม่กำหนด') className,s.semester,s.academic_year academicYear,CAST(s.credits AS CHAR) credits,COALESCE(s.study_days,'') studyDays,IFNULL(TIME_FORMAT(s.start_time,'%H:%i'),'') startTime,IFNULL(TIME_FORMAT(s.end_time,'%H:%i'),'') endTime,COALESCE(s.location,'') location,s.attendance_mode attendanceMode,s.is_active isActive,COALESCE(s.description,'') description,(SELECT COUNT(*) FROM students st WHERE st.class_id=s.classroom_id) studentCount FROM subjects s LEFT JOIN teachers t ON t.id=s.teacher_id LEFT JOIN classrooms c ON c.id=s.classroom_id ORDER BY s.subject_code`;
  const legacySubjectQuery = `SELECT s.id databaseId,s.subject_code subjectCode,s.subject_name subjectName,s.teacher_id teacherId,COALESCE(t.full_name,'ยังไม่กำหนด') teacherName,c.level gradeLevel,s.classroom_id classId,COALESCE(c.name,'ยังไม่กำหนด') className,COALESCE(ss.semester,1) semester,COALESCE(ss.academic_year,'') academicYear,'1.0' credits,'' studyDays,'' startTime,'' endTime,'' location,'EVERY_PERIOD' attendanceMode,1 isActive,'' description,(SELECT COUNT(*) FROM students st WHERE st.class_id=s.classroom_id) studentCount FROM subjects s LEFT JOIN teachers t ON t.id=s.teacher_id LEFT JOIN classrooms c ON c.id=s.classroom_id LEFT JOIN (SELECT semester,academic_year FROM school_settings ORDER BY id LIMIT 1) ss ON 1=1 ORDER BY s.subject_code`;
  const subjectPromise = rows<SubjectRow>(subjectQuery).catch(
    (error: unknown) => {
      if ((error as { code?: string }).code === "ER_BAD_FIELD_ERROR")
        return rows<SubjectRow>(legacySubjectQuery);
      throw error;
    },
  );
  type ScheduleRow = RowDataPacket & { id: number; subjectId: number; dayOfWeek: number; startTime: string; endTime: string; periodName: string | null };
  const schedulePromise = rows<ScheduleRow>(
    `SELECT id,subject_id subjectId,day_of_week dayOfWeek,TIME_FORMAT(start_time,'%H:%i') startTime,TIME_FORMAT(end_time,'%H:%i') endTime,period_name periodName FROM schedules WHERE is_active=1 ORDER BY subject_id,day_of_week,start_time`,
  );
  const [subjectRows, teacherRows, classRows, settingRows, scheduleRows] = await Promise.all([
    subjectPromise,
    rows<RowDataPacket & SubjectOption>(
      `SELECT id,full_name name FROM teachers ORDER BY full_name`,
    ),
    rows<RowDataPacket & ClassroomOption>(
      `SELECT id,name,level FROM classrooms ORDER BY level,name`,
    ),
    rows<RowDataPacket & { academicYear: string }>(
      `SELECT academic_year academicYear FROM school_settings ORDER BY id LIMIT 1`,
    ),
    schedulePromise,
  ]);
  const dayNames = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
  const subjects: SubjectRecord[] = subjectRows.map((row) => {
    const schedules = scheduleRows
      .filter((schedule) => schedule.subjectId === row.databaseId)
      .map((schedule) => ({ ...schedule, periodName: schedule.periodName || "คาบเรียน" }));
    const firstSchedule = schedules[0];
    const scheduleSource = schedules.length === 0
      ? "SUBJECT"
      : schedules.every((schedule) => schedule.periodName === "คาบเรียนเดิม")
        ? "LEGACY_SUBJECT"
        : "SCHEDULE";
    return {
      ...row,
      semester: String(row.semester) as "1" | "2",
      gradeLevel: row.gradeLevel || classRows.find((c) => c.id === row.classId)?.level || "",
      studyDays: schedules.length ? [...new Set(schedules.map((schedule) => dayNames[schedule.dayOfWeek]))] : (row.studyDays ? row.studyDays.split(",").filter(Boolean) : []),
      startTime: firstSchedule?.startTime || row.startTime || "",
      endTime: firstSchedule?.endTime || row.endTime || "",
      location: row.location || "",
      isActive: Boolean(row.isActive),
      description: row.description || "",
      scheduleSource,
      schedules,
    };
  });
  return {
    subjects,
    teachers: teacherRows,
    classrooms: classRows,
    academicYear: settingRows[0]?.academicYear || "ยังไม่ระบุ",
  };
}
export async function getClasses() {
  return rows<
    RowDataPacket & { id: string; name: string; teacher: string; count: number }
  >(
    `SELECT CAST(c.id AS CHAR) id,c.name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COUNT(s.id) count FROM classrooms c LEFT JOIN teachers t ON t.id=c.advisor_teacher_id LEFT JOIN students s ON s.class_id=c.id GROUP BY c.id,c.name,t.full_name ORDER BY c.name`,
  );
}
export async function getClassroomPageData() {
  const [classRows, studentRows, teacherRows, settingRows] = await Promise.all([
    rows<
      RowDataPacket & {
        id: number;
        name: string;
        level: string;
        roomNumber: string;
        advisorTeacherId: number | null;
        advisorName: string;
        academicYear: string;
        semester: "1" | "2";
        isActive: number;
        note: string;
        studentCount: number;
      }
    >(
      `SELECT c.id,c.name,c.level,CAST(COALESCE(c.room_number,SUBSTRING_INDEX(c.name,'/',-1)) AS CHAR) roomNumber,c.advisor_teacher_id advisorTeacherId,COALESCE(t.full_name,'ยังไม่กำหนด') advisorName,c.academic_year academicYear,CAST(c.semester AS CHAR) semester,c.is_active isActive,COALESCE(c.note,'') note,COUNT(s.id) studentCount FROM classrooms c LEFT JOIN teachers t ON t.id=c.advisor_teacher_id LEFT JOIN students s ON s.class_id=c.id GROUP BY c.id,c.name,c.level,c.room_number,c.advisor_teacher_id,t.full_name,c.academic_year,c.semester,c.is_active,c.note ORDER BY c.level,c.name`,
    ),
    rows<
      RowDataPacket & {
        id: number;
        classId: number | null;
        number: number | null;
        code: string;
        name: string;
        faceRegistered: number;
      }
    >(
      `SELECT s.id,s.class_id classId,s.class_number number,s.student_code code,s.full_name name,EXISTS(SELECT 1 FROM face_data f WHERE f.student_id=s.id AND f.status='READY') faceRegistered FROM students s ORDER BY s.class_number,s.student_code`,
    ),
    rows<RowDataPacket & TeacherOption>(
      `SELECT id,full_name name FROM teachers ORDER BY full_name`,
    ),
    rows<RowDataPacket & { academicYear: string; semester: number }>(
      `SELECT academic_year academicYear,semester FROM school_settings ORDER BY id LIMIT 1`,
    ),
  ]);
  if (!settingRows[0]) {
    throw new Error("ไม่พบการตั้งค่าโรงเรียนในฐานข้อมูล");
  }
  const setting = settingRows[0];
  const classrooms: Classroom[] = classRows.map((c) => ({
    ...c,
    semester: String(c.semester) as "1" | "2",
    isActive: Boolean(c.isActive),
  }));
  const studentsByClass: Record<number, ClassStudent[]> = {};
  for (const s of studentRows) {
    if (!s.classId) continue;
    (studentsByClass[s.classId] ??= []).push({
      id: s.id,
      number: s.number || 0,
      code: s.code,
      name: s.name,
      gender:
        s.name.includes("เด็กหญิง") || s.name.includes("นางสาว")
          ? "หญิง"
          : s.name.includes("เด็กชาย") || s.name.includes("นาย")
            ? "ชาย"
            : "ไม่ระบุ",
      status: "ปกติ",
      faceRegistered: Boolean(s.faceRegistered),
    });
  }
  return {
    classrooms,
    studentsByClass,
    teachers: teacherRows,
    academicYear: setting.academicYear,
    semester: String(setting.semester) as "1" | "2",
  };
}
export async function getFaces() {
  return rows<
    RowDataPacket & {
      id: string;
      name: string;
      photos: string;
      status: string;
      date: string;
    }
  >(
    `SELECT s.student_code id,s.full_name name,CONCAT(f.image_count,' รูป') photos,CASE f.status WHEN 'READY' THEN 'พร้อมใช้งาน' WHEN 'NEEDS_IMAGES' THEN 'ควรเพิ่มรูป' ELSE 'ปิดใช้งาน' END status,DATE_FORMAT(f.registered_at,'%d/%m/%Y') date FROM face_data f JOIN students s ON s.id=f.student_id ORDER BY f.registered_at DESC`,
  );
}
export async function getFacePageData() {
  const [faceRows, sampleRows, studentRows] = await Promise.all([
    rows<RowDataPacket & Omit<FaceRecord, "sampleIds">>(
      `SELECT f.id faceDataId,f.student_id studentId,s.student_code studentCode,s.full_name studentName,COALESCE(c.name,'ยังไม่ระบุ') className,f.image_count photoCount,f.status,DATE_FORMAT(f.registered_at,'%d/%m/%Y %H:%i') registeredAt,DATE_FORMAT(f.updated_at,'%d/%m/%Y %H:%i') updatedAt FROM face_data f JOIN students s ON s.id=f.student_id LEFT JOIN classrooms c ON c.id=s.class_id ORDER BY f.updated_at DESC`,
    ),
    rows<RowDataPacket & { id: number; studentId: number }>(
      `SELECT id,student_id studentId FROM face_samples ORDER BY created_at,id`,
    ),
    rows<RowDataPacket & FaceStudentOption>(
      `SELECT s.id,s.student_code code,s.full_name name,COALESCE(c.name,'ยังไม่ระบุ') className,f.status faceStatus FROM students s LEFT JOIN classrooms c ON c.id=s.class_id LEFT JOIN face_data f ON f.student_id=s.id WHERE s.status='ACTIVE' ORDER BY s.student_code`,
    ),
  ]);
  const faces: FaceRecord[] = faceRows.map((face) => ({
    ...face,
    sampleIds: sampleRows
      .filter((sample) => sample.studentId === face.studentId)
      .map((sample) => sample.id),
  }));
  return { faces, students: studentRows };
}
export async function getAttendance() {
  return rows<
    RowDataPacket & {
      id: string;
      date: string;
      student: string;
      subject: string;
      time: string;
      status: string;
    }
  >(
    `SELECT CAST(a.id AS CHAR) id,DATE_FORMAT(a.attendance_date,'%d/%m/%Y') date,st.full_name student,COALESCE(sb.subject_name,'-') subject,COALESCE(DATE_FORMAT(a.check_in_time,'%H:%i:%s'),'-') time,CASE a.status WHEN 'PRESENT' THEN 'มาเรียน' WHEN 'LATE' THEN 'สาย' WHEN 'ABSENT' THEN 'ขาด' ELSE 'ลา' END status FROM attendance_records a JOIN students st ON st.id=a.student_id LEFT JOIN subjects sb ON sb.id=a.subject_id ORDER BY a.attendance_date DESC,a.check_in_time DESC LIMIT 200`,
  );
}
export async function getAttendancePageData(): Promise<AttendancePageData> {
  const [records, students, subjects, classrooms] = await Promise.all([
    rows<RowDataPacket & AttendanceRecord>(
      `SELECT a.id,a.student_id studentId,st.student_code studentCode,st.full_name studentName,st.class_id classroomId,COALESCE(c.name,'ยังไม่ระบุ') className,a.subject_id subjectId,COALESCE(sb.subject_code,'-') subjectCode,COALESCE(sb.subject_name,'ไม่ระบุรายวิชา') subjectName,DATE_FORMAT(a.attendance_date,'%Y-%m-%d') attendanceDate,IFNULL(TIME_FORMAT(a.check_in_time,'%H:%i:%s'),NULL) checkInTime,a.status,IFNULL(CAST(a.confidence AS DECIMAL(5,2)),NULL) confidence,DATE_FORMAT(a.created_at,'%d/%m/%Y %H:%i') createdAt FROM attendance_records a JOIN students st ON st.id=a.student_id LEFT JOIN classrooms c ON c.id=st.class_id LEFT JOIN subjects sb ON sb.id=a.subject_id ORDER BY a.attendance_date DESC,a.check_in_time DESC,a.id DESC LIMIT 500`,
    ),
    rows<
      RowDataPacket & {
        id: number;
        code: string;
        name: string;
        classroomId: number | null;
        className: string;
      }
    >(
      `SELECT s.id,s.student_code code,s.full_name name,s.class_id classroomId,COALESCE(c.name,'ยังไม่ระบุ') className FROM students s LEFT JOIN classrooms c ON c.id=s.class_id WHERE s.status='ACTIVE' ORDER BY s.student_code`,
    ),
    rows<
      RowDataPacket & {
        id: number;
        code: string;
        name: string;
        classroomId: number | null;
      }
    >(
      `SELECT id,subject_code code,subject_name name,classroom_id classroomId FROM subjects WHERE is_active=1 ORDER BY subject_code`,
    ),
    rows<RowDataPacket & { id: number; name: string }>(
      `SELECT id,name FROM classrooms ORDER BY level,name`,
    ),
  ]);
  return { records, students, subjects, classrooms };
}
export async function getCheckInPageData(date: string) {
  const [classrooms, subjects, sessionResult] = await Promise.all([
    rows<RowDataPacket & CheckInClassroom>(
      `SELECT id,name,level FROM classrooms ORDER BY level,name`,
    ),
    rows<RowDataPacket & CheckInSubject>(
      `SELECT s.id,s.subject_code code,s.subject_name name,s.classroom_id classroomId,COALESCE(c.name,'ยังไม่กำหนด') className,COALESCE(TIME_FORMAT(s.start_time,'%H:%i'),'08:00') startTime,COALESCE(TIME_FORMAT(s.end_time,'%H:%i'),'09:00') endTime FROM subjects s LEFT JOIN classrooms c ON c.id=s.classroom_id WHERE s.is_active=1 AND s.classroom_id IS NOT NULL ORDER BY s.subject_code`,
    ),
    db.execute<(RowDataPacket & CheckInSession)[]>(
      `SELECT cs.id,cs.subject_id subjectId,s.subject_code subjectCode,s.subject_name subjectName,cs.classroom_id classroomId,c.name className,DATE_FORMAT(cs.session_date,'%Y-%m-%d') sessionDate,TIME_FORMAT(cs.start_time,'%H:%i') startTime,TIME_FORMAT(cs.end_time,'%H:%i') endTime,TIME_FORMAT(cs.late_after,'%H:%i') lateAfter,cs.status,(SELECT COUNT(*) FROM attendance_records a WHERE a.check_in_session_id=cs.id) checkedInCount FROM check_in_sessions cs JOIN subjects s ON s.id=cs.subject_id JOIN classrooms c ON c.id=cs.classroom_id WHERE cs.session_date=? ORDER BY cs.start_time DESC`,
      [date],
    ),
  ]);
  return { classrooms, subjects, sessions: sessionResult[0] };
}
