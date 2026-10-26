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
  StudentAccountOption,
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
import { getSchoolTerm } from "@/lib/academic-term";
import type { AcademicTerm } from "@/lib/academic-term";

// Database servers may use UTC. School-day filters must use Thailand's date.
const schoolTodaySql = "DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)";

async function rows<T extends RowDataPacket>(
  sql: string,
  values?: Array<string | number | Date | null>,
) {
  // Transient read failures are retried centrally by the pool wrapper.
  const [result] = await db.execute<T[]>(sql, values);
  return result;
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
    `SELECT (SELECT COUNT(*) FROM students WHERE status='ACTIVE') students,(SELECT COUNT(*) FROM teachers WHERE status='ACTIVE') teachers,(SELECT COUNT(*) FROM subjects WHERE is_active=1) subjects,(SELECT COUNT(DISTINCT student_id) FROM attendance_records WHERE attendance_date=${schoolTodaySql} AND status IN ('PRESENT','LATE')) attendanceToday`,
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
      // Room for the term the record belongs to (same rule as /api/attendance), not the
      // student's legacy class_id, so promoted students keep the room they were in.
      `SELECT st.student_code id,st.full_name name,COALESCE(c.name,'ยังไม่ระบุ') room,COALESCE(TIME_FORMAT(a.check_in_time,'%H:%i'),'-') time,CASE a.status WHEN 'PRESENT' THEN 'มาเรียน' WHEN 'LATE' THEN 'สาย' WHEN 'ABSENT' THEN 'ขาด' ELSE 'ลา' END status FROM attendance_records a JOIN students st ON st.id=a.student_id LEFT JOIN subjects sb ON sb.id=a.subject_id LEFT JOIN check_in_sessions cs ON cs.id=a.check_in_session_id LEFT JOIN classrooms c ON c.id=COALESCE(cs.classroom_id,sb.classroom_id,st.class_id) ORDER BY a.attendance_date DESC,a.check_in_time DESC,a.id DESC LIMIT 5`,
    ),
    rows<RowDataPacket & { date: string; students: number; rate: number; recorded: number }>(
      `SELECT DATE_FORMAT(attendance_date,'%Y-%m-%d') date,COUNT(DISTINCT CASE WHEN status IN ('PRESENT','LATE') THEN student_id END) students,ROUND(100*SUM(status IN ('PRESENT','LATE'))/COUNT(*),2) rate,COUNT(*) recorded FROM attendance_records WHERE attendance_date BETWEEN ${schoolTodaySql}-INTERVAL 29 DAY AND ${schoolTodaySql} GROUP BY attendance_date ORDER BY attendance_date`,
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
      `SELECT COALESCE(SUM(a.status='PRESENT'),0) present,COALESCE(SUM(a.status='LATE'),0) late,COALESCE(SUM(a.status='ABSENT'),0) absent,COALESCE(SUM(a.status='LEAVE'),0) \`leave\`,COUNT(*) recorded FROM attendance_records a JOIN (SELECT student_id,MAX(id) id FROM attendance_records WHERE attendance_date=${schoolTodaySql} GROUP BY student_id) latest ON latest.id=a.id`,
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
      // audit_logs.created_at is UTC; show school time with a Buddhist-era year. Closing a
      // check-in round also logs every absent student ("ปิดรอบ…" on attendance_record); the
      // round's own CLOSE row summarises them, so they are left out of this short feed.
      `SELECT CAST(log_id AS CHAR) id,action,entity,COALESCE(description,'กิจกรรมในระบบ') description,CONCAT(DATE_FORMAT(created_at + INTERVAL 7 HOUR,'%d/%m/'),YEAR(created_at + INTERVAL 7 HOUR)+543,' ',DATE_FORMAT(created_at + INTERVAL 7 HOUR,'%H:%i')) createdAt FROM audit_logs WHERE NOT (entity='attendance_record' AND COALESCE(description,'') LIKE 'ปิดรอบ%') ORDER BY created_at DESC,log_id DESC LIMIT 5`,
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
      `SELECT DISTINCT date FROM (SELECT DATE_FORMAT(attendance_date,'%Y-%m-%d') date FROM attendance_records WHERE attendance_date>=DATE_FORMAT(${schoolTodaySql},'%Y-%m-01') UNION ALL SELECT DATE_FORMAT(created_at + INTERVAL 7 HOUR,'%Y-%m-%d') date FROM audit_logs WHERE created_at>=DATE_FORMAT(${schoolTodaySql},'%Y-%m-01')-INTERVAL 7 HOUR) dashboard_dates ORDER BY date`,
    ),
  ]);
  const dailyByDate = new Map(dailyRows.map((row) => [row.date, row]));
  const schoolNow = Date.now() + 7 * 60 * 60 * 1000;
  const daily = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(schoolNow);
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() - (29 - index));
    const key = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0"),
    ].join("-");
    const row = dailyByDate.get(key);
    return {
      date: key,
      day: `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      students: Number(row?.students ?? 0),
      rate: Number(row?.rate ?? 0),
      recorded: Number(row?.recorded ?? 0),
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
    conditions.push("COALESCE(cs.classroom_id,sb.classroom_id,st.class_id)=?");
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
        >(`SELECT DATE_FORMAT(a.attendance_date,'%Y-%m-%d') date,st.student_code studentCode,st.full_name studentName,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(sb.subject_code,'-') subjectCode,COALESCE(sb.subject_name,'ไม่ระบุ') subjectName,COALESCE(TIME_FORMAT(a.check_in_time,'%H:%i'),'-') time,a.status FROM attendance_records a JOIN students st ON st.id=a.student_id LEFT JOIN subjects sb ON sb.id=a.subject_id LEFT JOIN check_in_sessions cs ON cs.id=a.check_in_session_id LEFT JOIN classrooms c ON c.id=COALESCE(cs.classroom_id,sb.classroom_id,st.class_id) WHERE ${where} ORDER BY a.attendance_date DESC,a.check_in_time DESC LIMIT 2000`, params)
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
  const total = records.length;
  let present = 0, late = 0, absent = 0, leave = 0;
  const map = new Map<string, { total: number; students: number }>();
  // Aggregate once without repeatedly copying a day's entire record array.
  for (const record of records) {
    if (record.status === "PRESENT") present++;
    else if (record.status === "LATE") late++;
    else if (record.status === "ABSENT") absent++;
    else if (record.status === "LEAVE") leave++;
    const day = map.get(record.date) || { total: 0, students: 0 };
    day.total++;
    if (record.status === "PRESENT" || record.status === "LATE") day.students++;
    map.set(record.date, day);
  }
  const daily = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, counts]) => ({
      day: day.slice(5).split("-").reverse().join("/"),
      students: counts.students,
      rate: counts.total
        ? Number(((100 * counts.students) / counts.total).toFixed(2))
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
    `SELECT CONCAT('A',a.id) id,a.id databaseId,a.full_name name,a.email,'admin' role,a.status,CONCAT('A',LPAD(a.id,3,'0')) code,NULL classId,'' className,'' classLevel,CAST(a.created_at AS CHAR) createdAt,0 hasProfileImage,CASE WHEN a.status='ACTIVE' AND EXISTS(SELECT 1 FROM auth_sessions session_row WHERE session_row.account_id=a.id AND session_row.account_role='admin' AND session_row.revoked_at IS NULL AND session_row.expires_at>NOW(3)) THEN 1 ELSE 0 END isLoggedIn FROM admins a UNION ALL SELECT CONCAT('T',t.id),t.id,t.full_name,t.email,'teacher',t.status,COALESCE(t.teacher_code,CONCAT('T',LPAD(t.id,3,'0'))),NULL,'','',CAST(t.created_at AS CHAR),t.profile_image IS NOT NULL,CASE WHEN t.status='ACTIVE' AND EXISTS(SELECT 1 FROM auth_sessions session_row WHERE session_row.account_id=t.id AND session_row.account_role='teacher' AND session_row.revoked_at IS NULL AND session_row.expires_at>NOW(3)) THEN 1 ELSE 0 END FROM teachers t UNION ALL SELECT CONCAT('S',s.id),s.id,s.full_name,s.email,'student',s.status,s.student_code,s.class_id,COALESCE(c.name,''),COALESCE(c.level,''),CAST(s.created_at AS CHAR),s.profile_image IS NOT NULL,CASE WHEN s.status='ACTIVE' AND EXISTS(SELECT 1 FROM auth_sessions session_row WHERE session_row.account_id=s.id AND session_row.account_role='student' AND session_row.revoked_at IS NULL AND session_row.expires_at>NOW(3)) THEN 1 ELSE 0 END FROM students s LEFT JOIN classrooms c ON c.id=s.class_id ORDER BY role,name`,
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
export async function getStudentPageData(selectedTerm?: AcademicTerm) {
  const term = selectedTerm ?? await getSchoolTerm();
  const [students, classrooms, accessRows, accountRows, historyRows, yearRows] = await Promise.all([
    rows<RowDataPacket & StudentRecord>(
      `SELECT s.id databaseId,s.student_code studentCode,s.full_name fullName,s.email,e.classroom_id classId,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(c.level,'') classLevel,e.class_number classNumber,e.academic_year academicYear,CAST(e.semester AS CHAR) semester,COALESCE(s.parent_name,'') parentName,COALESCE(s.phone,'') phone,s.status,s.profile_image IS NOT NULL hasProfileImage,CASE WHEN s.status='ACTIVE' AND EXISTS(SELECT 1 FROM auth_sessions session_row WHERE session_row.account_id=s.id AND session_row.account_role='student' AND session_row.revoked_at IS NULL AND session_row.expires_at>NOW(3)) THEN 1 ELSE 0 END isLoggedIn FROM student_term_enrollments e JOIN students s ON s.id=e.student_id LEFT JOIN classrooms c ON c.id=e.classroom_id WHERE e.academic_year=? AND e.semester=? ORDER BY s.student_code`,
      [term.academicYear, term.semester],
    ),
    rows<RowDataPacket & StudentClassroomOption>(
      `SELECT c.id,c.name,c.level,COALESCE(t.full_name,'ยังไม่กำหนด') advisorName,c.academic_year academicYear,CAST(c.semester AS CHAR) semester FROM classrooms c LEFT JOIN teachers t ON t.id=c.advisor_teacher_id ORDER BY c.level,c.name`,
    ),
    rows<RowDataPacket & { latestAccess: string | null }>(
      `SELECT CAST(MAX(a.created_at) AS CHAR) latestAccess FROM auth_sessions a JOIN students s ON s.id=a.account_id WHERE a.account_role='student'`,
    ),
    rows<RowDataPacket & StudentAccountOption>(
      `SELECT s.id databaseId,s.student_code studentCode,s.full_name fullName,s.email,s.status FROM students s WHERE NOT EXISTS (SELECT 1 FROM student_term_enrollments e WHERE e.student_id=s.id AND e.academic_year=? AND e.semester=?) ORDER BY s.student_code`,
      [term.academicYear, term.semester],
    ),
    rows<RowDataPacket & { studentId: number; classroomId: number; className: string; classNumber: number | null; academicYear: string; semester: string }>(
      `SELECT e.student_id studentId,e.classroom_id classroomId,c.name className,e.class_number classNumber,e.academic_year academicYear,CAST(e.semester AS CHAR) semester FROM student_term_enrollments e JOIN classrooms c ON c.id=e.classroom_id ORDER BY e.academic_year DESC,e.semester DESC,c.name`,
    ),
    rows<RowDataPacket & { academicYear: string }>(
      `SELECT academicYear FROM (SELECT academic_year academicYear FROM student_term_enrollments UNION SELECT academic_year academicYear FROM classrooms UNION SELECT academic_year academicYear FROM school_settings) years ORDER BY academicYear DESC`,
    ),
  ]);
  const termHistoryByStudent = new Map<number, StudentRecord["termHistory"]>();
  for (const row of historyRows) {
    const history = termHistoryByStudent.get(row.studentId) ?? [];
    history.push({
      classroomId: row.classroomId,
      className: row.className,
      classNumber: row.classNumber,
      academicYear: row.academicYear,
      semester: row.semester as "1" | "2",
    });
    termHistoryByStudent.set(row.studentId, history);
  }
  for (const student of students) {
    student.semester = String(student.semester) as "1" | "2";
    student.termHistory = termHistoryByStudent.get(student.databaseId) ?? [];
  }
  const availableStudents: StudentAccountOption[] = accountRows.map((student) => ({
    ...student,
    termHistory: termHistoryByStudent.get(student.databaseId) ?? [],
  }));
  return {
    students,
    availableStudents,
    classrooms,
    latestAccess: accessRows[0]?.latestAccess || null,
    academicYear: term.academicYear,
    semester: String(term.semester) as "1" | "2",
    academicYears: [...new Set([term.academicYear, ...yearRows.map((row) => row.academicYear)])],
  };
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
      `SELECT t.id databaseId,COALESCE(t.teacher_code,CONCAT('T',LPAD(t.id,3,'0'))) teacherCode,t.full_name fullName,t.email,COALESCE(t.department,'') department,COALESCE(t.phone,'') phone,t.status,t.profile_image IS NOT NULL hasProfileImage,CASE WHEN t.status='ACTIVE' AND EXISTS(SELECT 1 FROM auth_sessions session_row WHERE session_row.account_id=t.id AND session_row.account_role='teacher' AND session_row.revoked_at IS NULL AND session_row.expires_at>NOW(3)) THEN 1 ELSE 0 END isLoggedIn FROM teachers t ORDER BY t.full_name`,
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
    `SELECT s.subject_code id,s.subject_name name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COALESCE(c.name,'ยังไม่กำหนด') room,CONCAT((SELECT COUNT(*) FROM student_term_enrollments e WHERE e.classroom_id=s.classroom_id AND e.academic_year=s.academic_year AND e.semester=s.semester),' คน') students FROM subjects s LEFT JOIN teachers t ON t.id=s.teacher_id LEFT JOIN classrooms c ON c.id=s.classroom_id ORDER BY s.academic_year DESC,s.semester DESC,s.subject_code`,
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
  const subjectQuery = `SELECT s.id databaseId,s.subject_code subjectCode,s.subject_name subjectName,s.teacher_id teacherId,COALESCE(t.full_name,'ยังไม่กำหนด') teacherName,s.grade_level gradeLevel,s.classroom_id classId,COALESCE(c.name,'ยังไม่กำหนด') className,s.semester,s.academic_year academicYear,CAST(s.credits AS CHAR) credits,COALESCE(s.study_days,'') studyDays,IFNULL(TIME_FORMAT(s.start_time,'%H:%i'),'') startTime,IFNULL(TIME_FORMAT(s.end_time,'%H:%i'),'') endTime,COALESCE(s.location,'') location,s.attendance_mode attendanceMode,s.is_active isActive,COALESCE(s.description,'') description,(SELECT COUNT(*) FROM student_term_enrollments e JOIN students st ON st.id=e.student_id WHERE e.classroom_id=s.classroom_id AND e.academic_year=s.academic_year AND e.semester=s.semester AND st.status='ACTIVE') studentCount FROM subjects s LEFT JOIN teachers t ON t.id=s.teacher_id LEFT JOIN classrooms c ON c.id=s.classroom_id ORDER BY s.academic_year DESC,s.semester DESC,s.subject_code`;
  const legacySubjectQuery = `SELECT s.id databaseId,s.subject_code subjectCode,s.subject_name subjectName,s.teacher_id teacherId,COALESCE(t.full_name,'ยังไม่กำหนด') teacherName,c.level gradeLevel,s.classroom_id classId,COALESCE(c.name,'ยังไม่กำหนด') className,COALESCE(ss.semester,1) semester,COALESCE(ss.academic_year,'') academicYear,'1.0' credits,'' studyDays,'' startTime,'' endTime,'' location,'EVERY_PERIOD' attendanceMode,1 isActive,'' description,0 studentCount FROM subjects s LEFT JOIN teachers t ON t.id=s.teacher_id LEFT JOIN classrooms c ON c.id=s.classroom_id LEFT JOIN (SELECT semester,academic_year FROM school_settings ORDER BY id LIMIT 1) ss ON 1=1 ORDER BY s.subject_code`;
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
  const [subjectRows, teacherRows, classRows, settingRows, yearRows, scheduleRows] = await Promise.all([
    subjectPromise,
    rows<RowDataPacket & SubjectOption>(
      `SELECT id,full_name name FROM teachers ORDER BY full_name`,
    ),
    rows<RowDataPacket & ClassroomOption>(
      `SELECT id,name,level FROM classrooms ORDER BY level,name`,
    ),
    rows<RowDataPacket & { academicYear: string; semester: number }>(
      `SELECT academic_year academicYear,semester FROM school_settings ORDER BY id LIMIT 1`,
    ),
    rows<RowDataPacket & { academicYear: string }>(
      `SELECT academicYear FROM (SELECT academic_year academicYear FROM subjects UNION SELECT academic_year academicYear FROM school_settings) years ORDER BY academicYear DESC`,
    ),
    schedulePromise,
  ]);
  const dayNames = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];
  const schedulesBySubject = new Map<number, ScheduleRow[]>();
  for (const schedule of scheduleRows) {
    const group = schedulesBySubject.get(schedule.subjectId) || [];
    group.push(schedule);
    schedulesBySubject.set(schedule.subjectId, group);
  }
  const subjects: SubjectRecord[] = subjectRows.map((row) => {
    const schedules = (schedulesBySubject.get(row.databaseId) || [])
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
    semester: String(settingRows[0]?.semester || 1) as "1" | "2",
    academicYears: [...new Set([settingRows[0]?.academicYear || "", ...yearRows.map((row) => row.academicYear)].filter(Boolean))],
  };
}
export async function getClasses() {
  return rows<
    RowDataPacket & { id: string; name: string; teacher: string; count: number }
  >(
    `SELECT CAST(c.id AS CHAR) id,c.name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COUNT(DISTINCT e.student_id) count FROM classrooms c LEFT JOIN teachers t ON t.id=c.advisor_teacher_id LEFT JOIN student_term_enrollments e ON e.classroom_id=c.id AND e.academic_year=c.academic_year AND e.semester=c.semester GROUP BY c.id,c.name,t.full_name ORDER BY c.name`,
  );
}
export async function getClassroomPageData(selectedTerm?: AcademicTerm) {
  const term = selectedTerm ?? await getSchoolTerm();
  const [classRows, studentRows, teacherRows, yearRows] = await Promise.all([
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
      `SELECT c.id,c.name,c.level,CAST(COALESCE(c.room_number,SUBSTRING_INDEX(c.name,'/',-1)) AS CHAR) roomNumber,c.advisor_teacher_id advisorTeacherId,COALESCE(t.full_name,'ยังไม่กำหนด') advisorName,c.academic_year academicYear,CAST(c.semester AS CHAR) semester,c.is_active isActive,COALESCE(c.note,'') note,COUNT(DISTINCT e.student_id) studentCount FROM classrooms c LEFT JOIN teachers t ON t.id=c.advisor_teacher_id LEFT JOIN student_term_enrollments e ON e.classroom_id=c.id AND e.academic_year=? AND e.semester=? GROUP BY c.id,c.name,c.level,c.room_number,c.advisor_teacher_id,t.full_name,c.academic_year,c.semester,c.is_active,c.note ORDER BY c.level,c.name`,
      [term.academicYear, term.semester],
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
      `SELECT e.student_id id,e.classroom_id classId,e.class_number number,s.student_code code,s.full_name name,EXISTS(SELECT 1 FROM face_data f WHERE f.student_id=s.id AND f.status='READY') faceRegistered FROM student_term_enrollments e JOIN students s ON s.id=e.student_id WHERE e.academic_year=? AND e.semester=? ORDER BY e.classroom_id,e.class_number,s.student_code`,
      [term.academicYear, term.semester],
    ),
    rows<RowDataPacket & TeacherOption>(
      `SELECT id,full_name name FROM teachers ORDER BY full_name`,
    ),
    rows<RowDataPacket & { academicYear: string }>(
      `SELECT academicYear FROM (SELECT academic_year academicYear FROM student_term_enrollments UNION SELECT academic_year academicYear FROM school_settings) years ORDER BY academicYear DESC`,
    ),
  ]);
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
    academicYear: term.academicYear,
    semester: String(term.semester) as "1" | "2",
    academicYears: [...new Set([term.academicYear, ...yearRows.map((row) => row.academicYear)])],
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
  const sampleIdsByStudent = new Map<number, number[]>();
  for (const sample of sampleRows) {
    const ids = sampleIdsByStudent.get(sample.studentId) || [];
    ids.push(sample.id);
    sampleIdsByStudent.set(sample.studentId, ids);
  }
  const faces: FaceRecord[] = faceRows.map((face) => ({
    ...face,
    sampleIds: sampleIdsByStudent.get(face.studentId) || [],
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
  const term = await getSchoolTerm();
  const [records, students, subjectData] = await Promise.all([
    rows<RowDataPacket & AttendanceRecord>(
      `SELECT a.id,a.student_id studentId,st.student_code studentCode,st.full_name studentName,COALESCE(cs.classroom_id,sb.classroom_id,st.class_id) classroomId,COALESCE(c.name,'ยังไม่ระบุ') className,a.subject_id subjectId,COALESCE(sb.subject_code,'-') subjectCode,COALESCE(sb.subject_name,'ไม่ระบุรายวิชา') subjectName,DATE_FORMAT(a.attendance_date,'%Y-%m-%d') attendanceDate,IFNULL(TIME_FORMAT(a.check_in_time,'%H:%i:%s'),NULL) checkInTime,a.status,IFNULL(CAST(a.confidence AS DECIMAL(5,2)),NULL) confidence,DATE_FORMAT(a.created_at,'%d/%m/%Y %H:%i') createdAt FROM attendance_records a JOIN students st ON st.id=a.student_id LEFT JOIN subjects sb ON sb.id=a.subject_id LEFT JOIN check_in_sessions cs ON cs.id=a.check_in_session_id LEFT JOIN classrooms c ON c.id=COALESCE(cs.classroom_id,sb.classroom_id,st.class_id) ORDER BY a.attendance_date DESC,a.check_in_time DESC,a.id DESC LIMIT 500`,
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
      `SELECT s.id,s.student_code code,s.full_name name,e.classroom_id classroomId,COALESCE(c.name,'ยังไม่ระบุ') className FROM student_term_enrollments e JOIN students s ON s.id=e.student_id JOIN classrooms c ON c.id=e.classroom_id WHERE s.status='ACTIVE' AND e.academic_year=? AND e.semester=? ORDER BY s.student_code`,
      [term.academicYear, term.semester],
    ),
    getSubjectPageData(),
  ]);
  // Reuse this request's catalog rather than querying subjects/classrooms twice.
  const subjects = subjectData.subjects.filter(subject => subject.isActive).map(subject => ({
    id: subject.databaseId, code: subject.subjectCode, name: subject.subjectName,
    classroomId: subject.classId,
  }));
  const classrooms = subjectData.classrooms.map(({ id, name }) => ({ id, name }));
  const catalogSubjects = subjectData.subjects.map(subject => ({
      id: subject.databaseId, code: subject.subjectCode, name: subject.subjectName,
      classroomId: subject.classId, teacherName: subject.teacherName, gradeLevel: subject.gradeLevel,
      weeklyPeriods: subject.schedules.length || (subject.startTime && subject.endTime && subject.studyDays.length ? subject.studyDays.length : null),
    }));
  return { records, students, subjects, classrooms, catalogSubjects };
}
export async function getCheckInPageData(date: string) {
  const [classrooms, subjects, sessionResult, schedules] = await Promise.all([
    rows<RowDataPacket & CheckInClassroom>(
      `SELECT id,name,level FROM classrooms ORDER BY level,name`,
    ),
    rows<RowDataPacket & CheckInSubject>(
      `SELECT s.id,s.subject_code code,s.subject_name name,s.classroom_id classroomId,COALESCE(c.name,'ยังไม่กำหนด') className,COALESCE(TIME_FORMAT(s.start_time,'%H:%i'),'') startTime,COALESCE(TIME_FORMAT(s.end_time,'%H:%i'),'') endTime FROM subjects s LEFT JOIN classrooms c ON c.id=s.classroom_id WHERE s.is_active=1 AND s.classroom_id IS NOT NULL ORDER BY s.subject_code`,
    ),
    db.execute<(RowDataPacket & CheckInSession)[]>(
      `SELECT cs.id,cs.subject_id subjectId,s.subject_code subjectCode,s.subject_name subjectName,cs.classroom_id classroomId,c.name className,DATE_FORMAT(cs.session_date,'%Y-%m-%d') sessionDate,TIME_FORMAT(cs.start_time,'%H:%i') startTime,TIME_FORMAT(cs.end_time,'%H:%i') endTime,TIME_FORMAT(cs.late_after,'%H:%i') lateAfter,cs.status,(SELECT COUNT(*) FROM attendance_records a WHERE a.check_in_session_id=cs.id) checkedInCount FROM check_in_sessions cs JOIN subjects s ON s.id=cs.subject_id JOIN classrooms c ON c.id=cs.classroom_id WHERE cs.session_date=? ORDER BY cs.start_time DESC`,
      [date],
    ),
    rows<RowDataPacket & { id: number; subjectId: number; dayOfWeek: number; periodName: string; startTime: string; endTime: string }>("SELECT id,subject_id subjectId,day_of_week dayOfWeek,COALESCE(period_name,'คาบเรียน') periodName,TIME_FORMAT(start_time,'%H:%i') startTime,TIME_FORMAT(end_time,'%H:%i') endTime FROM schedules WHERE is_active=1 ORDER BY day_of_week,start_time"),
  ]);
  return { classrooms, subjects: subjects.map(subject => ({ ...subject, schedules: schedules.filter(schedule => schedule.subjectId === subject.id) })), sessions: sessionResult[0] };
}
