import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { cache } from "react";
import type { AttendanceDayRecord } from "@/lib/attendance-stats";
import { db } from "@/lib/db";
import { normalizeCoursePage } from "@/lib/face-registration-rules.mjs";

const studyDayLabels: Record<string, string> = {
  "1": "จันทร์",
  "2": "อังคาร",
  "3": "พุธ",
  "4": "พฤหัสบดี",
  "5": "ศุกร์",
  "6": "เสาร์",
  "7": "อาทิตย์",
};

function normalizeStudyDays(studyDays: string | null | undefined): string[] {
  return (studyDays || "")
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean)
    .map((day) => studyDayLabels[day] || day.replace(/^วัน/, ""));
}

export type StudentCourseSchedule = {
  id: number;
  dayOfWeek: number;
  day: string;
  periodName: string;
  startTime: string;
  endTime: string;
};

function scheduleDayName(dayOfWeek: number) {
  return studyDayLabels[String(dayOfWeek)] || `วันที่ ${dayOfWeek}`;
}

export type StudentDashboardData = {
  student: {
    id: number;
    name: string;
    code: string;
    className: string;
    classLevel: string;
    classId: number | null;
    faceReady: boolean;
    hasProfileImage: boolean;
  };
  term: { semester: number; academicYear: string };
  stats: {
    subjects: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    total: number;
    rate: number;
  };
  today: Array<{
    id: number;
    code: string;
    name: string;
    teacher: string;
    room: string;
    startTime: string;
    endTime: string;
  }>;
  recent: Array<{
    id: number;
    date: string;
    subject: string;
    checkIn: string;
    status: "มาเรียน" | "สาย" | "ขาด" | "ลา";
  }>;
};

type CountRow = RowDataPacket & {
  subjects: number;
  present: number;
  late: number;
  absent: number;
  leaveCount: number;
  total: number;
};

type SchoolSettings = { semester: number; academicYear: string };

const getSchoolSettings = cache(async (): Promise<SchoolSettings | null> => {
  const [settings] = await db.execute<(RowDataPacket & SchoolSettings)[]>(
    `SELECT semester,academic_year academicYear FROM school_settings ORDER BY id LIMIT 1`,
  );
  return settings[0] ?? null;
});

export async function getStudentDashboardData(
  studentId: number,
): Promise<StudentDashboardData | null> {
  const [student, settings, [counts], [today], [recent]] =
    await Promise.all([
      getStudentIdentity(studentId),
      getSchoolSettings(),
      db.execute<CountRow[]>(
        `SELECT (SELECT COUNT(*) FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id WHERE st.id=? AND sb.is_active=1) subjects,SUM(a.status='PRESENT') present,SUM(a.status='LATE') late,SUM(a.status='ABSENT') absent,SUM(a.status='LEAVE') leaveCount,COUNT(a.id) total FROM attendance_records a WHERE a.student_id=?`,
        [studentId, studentId],
      ),
      db.execute<
        (RowDataPacket & {
          id: number;
          code: string;
          name: string;
          teacher: string;
          room: string;
          startTime: string;
          endTime: string;
        })[]
      >(
        `SELECT sb.id,sb.subject_code code,sb.subject_name name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COALESCE(sb.location,c.name,'ยังไม่ระบุ') room,COALESCE(TIME_FORMAT(sc.start_time,'%H:%i'),TIME_FORMAT(sb.start_time,'%H:%i'),'--:--') startTime,COALESCE(TIME_FORMAT(sc.end_time,'%H:%i'),TIME_FORMAT(sb.end_time,'%H:%i'),'--:--') endTime FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id LEFT JOIN teachers t ON t.id=sb.teacher_id LEFT JOIN classrooms c ON c.id=sb.classroom_id LEFT JOIN schedules sc ON sc.subject_id=sb.id AND sc.is_active=1 AND sc.day_of_week=WEEKDAY(CURRENT_DATE)+1 WHERE st.id=? AND sb.is_active=1 AND (sc.id IS NOT NULL OR (NOT EXISTS(SELECT 1 FROM schedules legacy_sc WHERE legacy_sc.subject_id=sb.id AND legacy_sc.is_active=1) AND (sb.study_days IS NULL OR sb.study_days='' OR FIND_IN_SET(ELT(WEEKDAY(CURRENT_DATE)+1,'จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'),sb.study_days) OR FIND_IN_SET(WEEKDAY(CURRENT_DATE)+1,sb.study_days)))) ORDER BY COALESCE(sc.start_time,sb.start_time) LIMIT 6`,
        [studentId],
      ),
      db.execute<
        (RowDataPacket & {
          id: number;
          date: string;
          subject: string;
          checkIn: string;
          status: "มาเรียน" | "สาย" | "ขาด" | "ลา";
        })[]
      >(
        `SELECT a.id,DATE_FORMAT(a.attendance_date,'%d/%m/%Y') date,COALESCE(sb.subject_name,'ไม่ระบุรายวิชา') subject,COALESCE(TIME_FORMAT(a.check_in_time,'%H:%i'),'-') checkIn,CASE a.status WHEN 'PRESENT' THEN 'มาเรียน' WHEN 'LATE' THEN 'สาย' WHEN 'ABSENT' THEN 'ขาด' ELSE 'ลา' END status FROM attendance_records a LEFT JOIN subjects sb ON sb.id=a.subject_id WHERE a.student_id=? ORDER BY a.attendance_date DESC,a.check_in_time DESC LIMIT 5`,
        [studentId],
      ),
    ]);
  if (!student) return null;
  if (!settings) throw new Error("ไม่พบการตั้งค่าโรงเรียนในฐานข้อมูล");
  const raw = counts[0] || {
    subjects: 0,
    present: 0,
    late: 0,
    absent: 0,
    leaveCount: 0,
    total: 0,
  };
  return {
    student: {
      id: student.id,
      name: student.name,
      code: student.code,
      className: student.className,
      classLevel: student.classLevel,
      classId: student.classId,
      faceReady: student.faceReady,
      hasProfileImage: student.hasProfileImage,
    },
    term: settings,
    stats: {
      subjects: Number(raw.subjects) || 0,
      present: Number(raw.present) || 0,
      late: Number(raw.late) || 0,
      absent: Number(raw.absent) || 0,
      leave: Number(raw.leaveCount) || 0,
      total: Number(raw.total) || 0,
      rate: raw.total
        ? Number(
            (
              (((Number(raw.present) || 0) + (Number(raw.late) || 0)) * 100) /
              Number(raw.total)
            ).toFixed(1),
          )
        : 0,
    },
    today,
    recent,
  };
}

export type StudentIdentity = {
  id: number;
  name: string;
  code: string;
  email: string;
  phone: string;
  birthday: string;
  address: string;
  hasProfileImage: boolean;
  faceReady: boolean;
  classId: number | null;
  className: string;
  classLevel: string;
  classNumber: number | null;
  initials: string;
};

async function loadStudentIdentity(
  studentId: number,
): Promise<StudentIdentity | null> {
  const [rows] = await db.execute<
    (RowDataPacket &
      Omit<StudentIdentity, "initials" | "hasProfileImage" | "faceReady"> & {
        hasProfileImage: number;
        faceReady: number;
      })[]
  >(
    `SELECT s.id,s.full_name name,s.student_code code,s.email,COALESCE(s.phone,'') phone,COALESCE(DATE_FORMAT(s.birthday,'%Y-%m-%d'),'') birthday,COALESCE(s.address,'') address,(s.profile_image IS NOT NULL) hasProfileImage,EXISTS(SELECT 1 FROM face_data fd WHERE fd.student_id=s.id AND fd.status='READY') faceReady,s.class_id classId,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(c.level,'') classLevel,s.class_number classNumber FROM students s LEFT JOIN classrooms c ON c.id=s.class_id WHERE s.id=? AND s.status='ACTIVE' LIMIT 1`,
    [studentId],
  );
  const item = rows[0];
  return item
    ? {
        ...item,
        hasProfileImage: Boolean(item.hasProfileImage),
        faceReady: Boolean(item.faceReady),
        initials: item.name
          .replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง)/, "")
          .trim()
          .slice(0, 2),
      }
    : null;
}

export const getStudentIdentity = cache(loadStudentIdentity);

export type StudentCourse={id:number;code:string;name:string;teacher:string;days:string[];startTime:string;endTime:string;room:string;credits:string;description:string;schedules:StudentCourseSchedule[];className?:string;classLevel?:string;gradeLevel?:string;semester?:number;academicYear?:string};
export async function getStudentCourses(studentId:number):Promise<StudentCourse[]>{
  type CourseRow=RowDataPacket&Omit<StudentCourse,"days"|"schedules">&{studyDays:string};
  type ScheduleRow=RowDataPacket&{id:number;subjectId:number;dayOfWeek:number;periodName:string|null;startTime:string;endTime:string};
  const [[courseRows],[scheduleRows]]=await Promise.all([
    db.execute<CourseRow[]>(`SELECT sb.id,sb.subject_code code,sb.subject_name name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COALESCE(sb.study_days,'') studyDays,COALESCE(TIME_FORMAT(sb.start_time,'%H:%i'),'--:--') startTime,COALESCE(TIME_FORMAT(sb.end_time,'%H:%i'),'--:--') endTime,COALESCE(sb.location,c.name,'ยังไม่ระบุ') room,CAST(sb.credits AS CHAR) credits,COALESCE(sb.description,'') description,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(c.level,'') classLevel,COALESCE(sb.grade_level,'') gradeLevel,COALESCE(sb.semester,1) semester,COALESCE(sb.academic_year,'') academicYear FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id LEFT JOIN teachers t ON t.id=sb.teacher_id LEFT JOIN classrooms c ON c.id=sb.classroom_id WHERE st.id=? AND st.status='ACTIVE' AND sb.is_active=1 ORDER BY sb.start_time,sb.subject_code`,[studentId]),
    db.execute<ScheduleRow[]>(`SELECT sc.id,sc.subject_id subjectId,sc.day_of_week dayOfWeek,sc.period_name periodName,TIME_FORMAT(sc.start_time,'%H:%i') startTime,TIME_FORMAT(sc.end_time,'%H:%i') endTime FROM schedules sc JOIN students st ON st.class_id=sc.classroom_id WHERE st.id=? AND st.status='ACTIVE' AND sc.is_active=1 ORDER BY sc.day_of_week,sc.start_time`,[studentId]),
  ]);
  return courseRows.map(({studyDays,...course})=>{
    const schedules=scheduleRows.filter((schedule)=>schedule.subjectId===course.id).map((schedule)=>({...schedule,day:scheduleDayName(schedule.dayOfWeek),periodName:schedule.periodName||"คาบเรียน"}));
    const first=schedules[0];
    return {...course,days:schedules.length?[...new Set(schedules.map((schedule)=>schedule.day))]:normalizeStudyDays(studyDays),startTime:first?.startTime??course.startTime,endTime:first?.endTime??course.endTime,schedules};
  });
}

export type StudentAttendance={id:number;date:string;subjectId:number|null;subjectCode:string;subject:string;classTime:string;checkIn:string;status:"มาเรียน"|"สาย"|"ขาด"|"ลา";note:string};
export async function getStudentAttendance(studentId:number,filters:{from?:string;to?:string;subjectId?:number;status?:string}={}){const where=["a.student_id=?"],params:(string|number)[]=[studentId];if(filters.from){where.push("a.attendance_date>=?");params.push(filters.from)}if(filters.to){where.push("a.attendance_date<=?");params.push(filters.to)}if(filters.subjectId){where.push("a.subject_id=?");params.push(filters.subjectId)}const allowed:Record<string,string>={present:"PRESENT",late:"LATE",absent:"ABSENT",leave:"LEAVE"};if(filters.status&&allowed[filters.status]){where.push("a.status=?");params.push(allowed[filters.status])}const[rows]=await db.execute<(RowDataPacket&StudentAttendance)[]>(`SELECT a.id,DATE_FORMAT(a.attendance_date,'%d/%m/%Y') date,a.subject_id subjectId,COALESCE(sb.subject_code,'-') subjectCode,COALESCE(sb.subject_name,'ไม่ระบุรายวิชา') subject,CONCAT(COALESCE(TIME_FORMAT(sb.start_time,'%H:%i'),'--:--'),'–',COALESCE(TIME_FORMAT(sb.end_time,'%H:%i'),'--:--')) classTime,COALESCE(TIME_FORMAT(a.check_in_time,'%H:%i'),'-') checkIn,CASE a.status WHEN 'PRESENT' THEN 'มาเรียน' WHEN 'LATE' THEN 'สาย' WHEN 'ABSENT' THEN 'ขาด' ELSE 'ลา' END status,CASE WHEN a.status='LATE' THEN 'มาสาย' WHEN a.status='ABSENT' THEN 'ไม่พบการเช็คชื่อ' WHEN a.status='LEAVE' THEN 'ลา' ELSE '-' END note FROM attendance_records a LEFT JOIN subjects sb ON sb.id=a.subject_id WHERE ${where.join(" AND ")} ORDER BY a.attendance_date DESC,a.check_in_time DESC LIMIT 500`,params);return rows}

export type StudentStatisticsFilters = {
  semester?: number;
  academicYear?: string;
  subjectId?: number;
  from?: string;
  to?: string;
};

type AttendanceStatusKey = "PRESENT" | "LATE" | "ABSENT" | "LEAVE";

type AttendanceCount = {
  present: number;
  late: number;
  absent: number;
  leave: number;
  total: number;
  rate: number;
};

export type StudentStats = {
  summary: AttendanceCount;
  trends: Record<"present" | "late" | "absent" | "leave" | "rate", number | null>;
  monthly: Array<{
    key: string;
    month: string;
    present: number;
    late: number;
    absent: number;
    leave: number;
    rate: number;
  }>;
  subjects: Array<{
    id: number;
    code: string;
    name: string;
    value: number;
    total: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
  }>;
  attendanceDays: AttendanceDayRecord[];
  filters: {
    semester?: number;
    academicYear?: string;
    subjectId?: number;
    from?: string;
    to?: string;
  };
  options: {
    terms: Array<{ semester: number; academicYear: string }>;
    semesters: number[];
    academicYears: string[];
    subjects: Array<{
      id: number;
      code: string;
      name: string;
      semester: number;
      academicYear: string;
    }>;
  };
};

type StatisticsRecord = RowDataPacket & {
  attendanceDate: string;
  status: AttendanceStatusKey;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  classTime: string;
};

function normalizeStatisticsDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : value;
}

function summarizeAttendance(records: StatisticsRecord[]): AttendanceCount {
  const count = records.reduce(
    (result, record) => {
      if (record.status === "PRESENT") result.present += 1;
      if (record.status === "LATE") result.late += 1;
      if (record.status === "ABSENT") result.absent += 1;
      if (record.status === "LEAVE") result.leave += 1;
      result.total += 1;
      return result;
    },
    { present: 0, late: 0, absent: 0, leave: 0, total: 0 },
  );

  return {
    ...count,
    rate: count.total
      ? Number((((count.present + count.late) * 100) / count.total).toFixed(1))
      : 0,
  };
}

function percentageChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return Number((((current - previous) * 100) / previous).toFixed(1));
}

export async function getStudentStatistics(
  studentId: number,
  requested: StudentStatisticsFilters = {},
): Promise<StudentStats | null> {
  type SubjectOptionRow = RowDataPacket & {
    id: number;
    code: string;
    name: string;
    semester: number;
    academicYear: string;
  };
  const [student, [subjectOptions], settings] = await Promise.all([
    getStudentIdentity(studentId),
    db.execute<SubjectOptionRow[]>(
      `SELECT sb.id,sb.subject_code code,sb.subject_name name,sb.semester,sb.academic_year academicYear
       FROM subjects sb
       JOIN students st ON st.class_id=sb.classroom_id
       WHERE st.id=? AND st.status='ACTIVE'
       ORDER BY CAST(sb.academic_year AS UNSIGNED) DESC,sb.semester DESC,sb.subject_name`,
      [studentId],
    ),
    getSchoolSettings(),
  ]);

  if (!student) return null;

  const semesters = [...new Set(subjectOptions.map((item) => Number(item.semester)))].sort();
  const academicYears = [...new Set(subjectOptions.map((item) => item.academicYear))].sort(
    (a, b) => Number(b) - Number(a),
  );
  const terms = Array.from(
    new Map(
      subjectOptions.map((item) => [
        `${item.semester}-${item.academicYear}`,
        { semester: Number(item.semester), academicYear: item.academicYear },
      ]),
    ).values(),
  );
  const defaultSettings = settings;
  const requestedSemester = Number(requested.semester);
  const semester = semesters.includes(requestedSemester)
    ? requestedSemester
    : semesters.includes(Number(defaultSettings?.semester))
      ? Number(defaultSettings?.semester)
      : semesters[0];
  const academicYear = academicYears.includes(requested.academicYear || "")
    ? requested.academicYear
    : academicYears.includes(defaultSettings?.academicYear || "")
      ? defaultSettings?.academicYear
      : academicYears[0];

  const subjectsForTerm = subjectOptions.filter(
    (item) =>
      (semester === undefined || Number(item.semester) === semester) &&
      (academicYear === undefined || item.academicYear === academicYear),
  );
  const subjectId = subjectsForTerm.some((item) => item.id === Number(requested.subjectId))
    ? Number(requested.subjectId)
    : undefined;

  const where = ["a.student_id=?", "st.status='ACTIVE'", "sb.classroom_id=st.class_id"];
  const values: Array<string | number> = [studentId];
  if (semester !== undefined) {
    where.push("sb.semester=?");
    values.push(semester);
  }
  if (academicYear !== undefined) {
    where.push("sb.academic_year=?");
    values.push(academicYear);
  }
  if (subjectId !== undefined) {
    where.push("sb.id=?");
    values.push(subjectId);
  }

  let from = normalizeStatisticsDate(requested.from);
  let to = normalizeStatisticsDate(requested.to);
  if (from && to && from > to) [from, to] = [to, from];
  let databaseFrom = from;
  if (from && to) {
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    const duration = toDate.getTime() - fromDate.getTime() + 86_400_000;
    databaseFrom = new Date(fromDate.getTime() - duration).toISOString().slice(0, 10);
  } else if (from && !to) {
    // The open-ended range still needs earlier rows for the comparison period.
    databaseFrom = undefined;
  }
  if (databaseFrom) {
    where.push("a.attendance_date>=?");
    values.push(databaseFrom);
  }
  if (to) {
    where.push("a.attendance_date<=?");
    values.push(to);
  }

  const [records] = await db.execute<StatisticsRecord[]>(
    `SELECT DATE_FORMAT(a.attendance_date,'%Y-%m-%d') attendanceDate,a.status,
            sb.id subjectId,sb.subject_code subjectCode,sb.subject_name subjectName,
            CONCAT(COALESCE(TIME_FORMAT(sb.start_time,'%H:%i'),'--:--'),'–',COALESCE(TIME_FORMAT(sb.end_time,'%H:%i'),'--:--')) classTime
     FROM attendance_records a
     JOIN students st ON st.id=a.student_id
     JOIN subjects sb ON sb.id=a.subject_id
     WHERE ${where.join(" AND ")}`,
    values,
  );

  if (records.length && (!from || !to)) {
    let firstDate = records[0].attendanceDate;
    let lastDate = firstDate;
    for (const record of records) {
      if (record.attendanceDate < firstDate) firstDate = record.attendanceDate;
      if (record.attendanceDate > lastDate) lastDate = record.attendanceDate;
    }
    if (!from) from = firstDate;
    if (!to) to = lastDate;
  }

  const filteredRecords = records.filter(
    (record) => (!from || record.attendanceDate >= from) && (!to || record.attendanceDate <= to),
  );
  const summary = summarizeAttendance(filteredRecords);

  let previousRecords: StatisticsRecord[] = [];
  if (from && to) {
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    const duration = toDate.getTime() - fromDate.getTime() + 86_400_000;
    const previousTo = new Date(fromDate.getTime() - 86_400_000);
    const previousFrom = new Date(previousTo.getTime() - duration + 86_400_000);
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);
    const previousFromValue = formatDate(previousFrom);
    const previousToValue = formatDate(previousTo);
    previousRecords = records.filter(
      (record) =>
        record.attendanceDate >= previousFromValue && record.attendanceDate <= previousToValue,
    );
  }
  const previous = summarizeAttendance(previousRecords);

  const monthFormatter = new Intl.DateTimeFormat("th-TH", {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
  const monthlyMap = new Map<
    string,
    { key: string; month: string; present: number; late: number; absent: number; leave: number; rate: number }
  >();
  for (const record of filteredRecords) {
    const key = record.attendanceDate.slice(0, 7);
    const item = monthlyMap.get(key) || {
      key,
      month: monthFormatter.format(new Date(`${key}-01T00:00:00Z`)),
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      rate: 0,
    };
    if (record.status === "PRESENT") item.present += 1;
    if (record.status === "LATE") item.late += 1;
    if (record.status === "ABSENT") item.absent += 1;
    if (record.status === "LEAVE") item.leave += 1;
    monthlyMap.set(key, item);
  }

  for (const item of monthlyMap.values()) {
    const monthTotal = item.present + item.late + item.absent + item.leave;
    item.rate = monthTotal
      ? Number((((item.present + item.late) * 100) / monthTotal).toFixed(1))
      : 0;
  }

  const subjectMap = new Map<number, StudentStats["subjects"][number]>();
  for (const subject of subjectsForTerm) {
    subjectMap.set(subject.id, {
      id: subject.id,
      code: subject.code,
      name: subject.name,
      value: 0,
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
    });
  }
  for (const record of filteredRecords) {
    const item = subjectMap.get(record.subjectId) || {
      id: record.subjectId,
      code: record.subjectCode,
      name: record.subjectName,
      value: 0,
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
    };
    if (record.status === "PRESENT") item.present += 1;
    if (record.status === "LATE") item.late += 1;
    if (record.status === "ABSENT") item.absent += 1;
    if (record.status === "LEAVE") item.leave += 1;
    item.total += 1;
    item.value = Number((((item.present + item.late) * 100) / item.total).toFixed(1));
    subjectMap.set(record.subjectId, item);
  }

  return {
    summary,
    trends: {
      present: percentageChange(summary.present, previous.present),
      late: percentageChange(summary.late, previous.late),
      absent: percentageChange(summary.absent, previous.absent),
      leave: percentageChange(summary.leave, previous.leave),
      rate: previous.total ? Number((summary.rate - previous.rate).toFixed(1)) : null,
    },
    monthly: [...monthlyMap.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6),
    subjects: [...subjectMap.values()]
      .sort((a, b) => (a.total ? a.value : 101) - (b.total ? b.value : 101) || a.name.localeCompare(b.name, "th")),
    attendanceDays: filteredRecords.map((record) => ({
      date: record.attendanceDate,
      status: record.status,
      subjectName: record.subjectName,
      subjectCode: record.subjectCode,
      classTime: record.classTime,
      note: record.status === "ABSENT" ? "ไม่พบการเช็คชื่อ" : record.status === "LATE" ? "มาสาย" : undefined,
    })),
    filters: { semester, academicYear, subjectId, from, to },
    options: { terms, semesters, academicYears, subjects: subjectsForTerm },
  };
}

export type FaceSampleItem = {
  id: number;
  poseType: "FRONT" | "LEFT" | "RIGHT" | "UP" | "DOWN" | null;
  qualityScore: number;
};

export type StudentFaceData = {
  status: "READY" | "NEEDS_IMAGES" | "INACTIVE";
  imageCount: number;
  registeredAt: string;
  updatedAt: string;
  studentName: string;
  studentCode: string;
  registeredByName: string | null;
  registeredByRole: string | null;
  deviceType: string | null;
  deviceName: string | null;
  browser: string | null;
  operatingSystem: string | null;
  registrationIp: null;
  cameraType: string | null;
  verificationMethod: string | null;
  livenessVerifiedAt: string | null;
  verifiedEmail: string | null;
  samples: FaceSampleItem[];
  sampleIds: number[];
} | null;

export async function getStudentFaceData(studentId: number): Promise<StudentFaceData> {
  const [[faces], [samples]] = await Promise.all([
    db.execute<
      (RowDataPacket & {
        status: "READY" | "NEEDS_IMAGES" | "INACTIVE";
        imageCount: number;
        registeredAt: string;
        updatedAt: string;
        studentName: string;
        studentCode: string;
        registeredByName: string | null;
        registeredByRole: string | null;
        deviceType: string | null;
        deviceName: string | null;
        browser: string | null;
        operatingSystem: string | null;
        cameraType: string | null;
        verificationMethod: string | null;
        livenessVerifiedAt: string | null;
        verifiedEmail: string | null;
      })[]
    >(
      `SELECT fd.status, fd.image_count imageCount,
              s.full_name studentName, s.student_code studentCode,
              DATE_FORMAT(fd.registered_at, '%d/%m/%Y %H:%i') registeredAt,
              DATE_FORMAT(fd.updated_at, '%d/%m/%Y %H:%i') updatedAt,
              registered_by_name registeredByName,
              registered_by_role registeredByRole,
              device_type deviceType,
              device_name deviceName,
              browser,
              operating_system operatingSystem,
              camera_type cameraType,
              verification_method verificationMethod,
              DATE_FORMAT(liveness_verified_at, '%d/%m/%Y %H:%i') livenessVerifiedAt,
              feb.verified_email verifiedEmail
       FROM face_data fd
       JOIN students s ON s.id = fd.student_id
       LEFT JOIN student_face_email_bindings feb ON feb.student_id=fd.student_id AND feb.face_data_id=fd.id
       WHERE fd.student_id = ?
       LIMIT 1`,
      [studentId],
    ),
    db.execute<
      (RowDataPacket & {
        id: number;
        poseType: "FRONT" | "LEFT" | "RIGHT" | "UP" | "DOWN" | null;
        qualityScore: number;
      })[]
    >(
      `SELECT id, pose_type poseType, CAST(quality_score AS DOUBLE) qualityScore
       FROM face_samples
       WHERE student_id = ?
       ORDER BY created_at, id
       LIMIT 10`,
      [studentId],
    ),
  ]);

  const face = faces[0];
  if (!face) return null;

  return {
    ...face,
    registrationIp: null,
    samples: samples.map((s) => ({
      id: s.id,
      poseType: s.poseType || null,
      qualityScore: Number(s.qualityScore) || 0,
    })),
    sampleIds: samples.map((s) => s.id),
  };
}

export type StudentCourseDetail = {
  id: number;
  code: string;
  name: string;
  teacher: string;
  days: string[];
  schedules: StudentCourseSchedule[];
  startTime: string;
  endTime: string;
  room: string;
  credits: string;
  description: string;
  semester: number;
  academicYear: string;
  gradeLevel: string;
  className: string;
  stats: {
    total: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    rate: number;
  };
  recentAttendance: Array<{
    id: number;
    date: string;
    periodName: string;
    classTime: string;
    room: string;
    checkIn: string;
    status: "มาเรียน" | "สาย" | "ขาด" | "ลา";
    note: string;
  }>;
  pagination: { page: number; pageSize: number; totalPages: number; totalItems: number };
  activeSession: {
    id: number;
    startTime: string;
    endTime: string;
    lateAfter: string;
    alreadyCheckedIn: boolean;
  } | null;
};

export async function getStudentCourseDetail(
  studentId: number,
  courseId: number,
  requestedPage: number | string = 1,
): Promise<{ authorized: boolean; course: StudentCourseDetail | null }> {
  // Check authorization: does this subject belong to the student's active classroom?
  const [courses] = await db.execute<
    (RowDataPacket & {
      id: number;
      code: string;
      name: string;
      teacher: string;
      studyDays: string | null;
      startTime: string;
      endTime: string;
      room: string;
      credits: string;
      description: string | null;
      semester: number;
      academicYear: string;
      gradeLevel: string | null;
      className: string;
      classroomId: number;
    })[]
  >(
    `SELECT sb.id, sb.subject_code code, sb.subject_name name,
            COALESCE(t.full_name, 'ยังไม่กำหนด') teacher,
            sb.study_days studyDays,
            COALESCE(TIME_FORMAT(sb.start_time, '%H:%i'), '--:--') startTime,
            COALESCE(TIME_FORMAT(sb.end_time, '%H:%i'), '--:--') endTime,
            COALESCE(sb.location, c.name, 'ยังไม่ระบุ') room,
            CAST(sb.credits AS CHAR) credits,
            COALESCE(sb.description, '') description,
            sb.semester, sb.academic_year academicYear,
            COALESCE(sb.grade_level, '') gradeLevel,
            COALESCE(c.name, 'ยังไม่ระบุ') className,
            sb.classroom_id classroomId
     FROM subjects sb
     JOIN students st ON st.class_id = sb.classroom_id
     LEFT JOIN teachers t ON t.id = sb.teacher_id
     LEFT JOIN classrooms c ON c.id = sb.classroom_id
     WHERE st.id = ? AND sb.id = ? AND st.status = 'ACTIVE' AND sb.is_active = 1
     LIMIT 1`,
    [studentId, courseId],
  );

  const row = courses[0];
  if (!row) {
    // Subject does not exist or student does not have access
    return { authorized: false, course: null };
  }

  const [statRows] = await db.execute<
      (RowDataPacket & {
        total: number;
        present: number;
        late: number;
        absent: number;
        leaveCount: number;
      })[]
    >(
      `SELECT COUNT(*) total,
              SUM(status = 'PRESENT') present,
              SUM(status = 'LATE') late,
              SUM(status = 'ABSENT') absent,
              SUM(status = 'LEAVE') leaveCount
       FROM attendance_records
       WHERE student_id = ? AND subject_id = ?`,
      [studentId, courseId],
    );
  const historyTotal = Number(statRows[0]?.total || 0);
  const pagination = normalizeCoursePage(requestedPage, historyTotal, 20);

  const [[recentRows], [activeSessions], [scheduleRows]] = await Promise.all([
    // Text-protocol binding preserves integer LIMIT/OFFSET on TiDB/mysql2.
    db.query<
      (RowDataPacket & {
        id: number;
        date: string;
        periodName: string;
        classTime: string;
        room: string;
        checkIn: string;
        status: "มาเรียน" | "สาย" | "ขาด" | "ลา";
        note: string;
      })[]
    >(
      `SELECT a.id,
              DATE_FORMAT(a.attendance_date, '%d/%m/%Y') date,
              COALESCE(sc.period_name, 'ไม่ระบุคาบ') periodName,
              CONCAT(
                COALESCE(TIME_FORMAT(cs.start_time, '%H:%i'), TIME_FORMAT(sb.start_time, '%H:%i'), '--:--'),
                '–',
                COALESCE(TIME_FORMAT(cs.end_time, '%H:%i'), TIME_FORMAT(sb.end_time, '%H:%i'), '--:--')
              ) classTime,
              COALESCE(sb.location, c.name, 'ไม่ระบุ') room,
              COALESCE(TIME_FORMAT(a.check_in_time, '%H:%i'), '-') checkIn,
              CASE a.status
                WHEN 'PRESENT' THEN 'มาเรียน'
                WHEN 'LATE' THEN 'สาย'
                WHEN 'ABSENT' THEN 'ขาด'
                ELSE 'ลา'
              END status,
              CASE a.status
                WHEN 'LATE' THEN 'เช็คชื่อหลังเวลาที่กำหนด'
                WHEN 'ABSENT' THEN 'ไม่พบการเช็คชื่อ'
                WHEN 'LEAVE' THEN 'บันทึกการลา'
                ELSE '-'
              END note
       FROM attendance_records a
       LEFT JOIN check_in_sessions cs ON cs.id = a.check_in_session_id
       LEFT JOIN schedules sc ON sc.id = cs.schedule_id
       LEFT JOIN subjects sb ON sb.id = a.subject_id
       LEFT JOIN classrooms c ON c.id = sb.classroom_id
       WHERE a.student_id = ? AND a.subject_id = ?
       ORDER BY a.attendance_date DESC, a.check_in_time DESC
       LIMIT ? OFFSET ?`,
      [studentId, courseId, pagination.pageSize, pagination.offset],
    ),
    db.execute<
      (RowDataPacket & {
        id: number;
        startTime: string;
        endTime: string;
        lateAfter: string;
        alreadyCheckedIn: number;
      })[]
    >(
      `SELECT cs.id,
              TIME_FORMAT(cs.start_time, '%H:%i') startTime,
              TIME_FORMAT(cs.end_time, '%H:%i') endTime,
              TIME_FORMAT(cs.late_after, '%H:%i') lateAfter,
              EXISTS(
                SELECT 1 FROM attendance_records a
                WHERE a.student_id = ? AND a.check_in_session_id = cs.id
              ) alreadyCheckedIn
       FROM check_in_sessions cs
       WHERE cs.subject_id = ? AND cs.classroom_id = ?
         AND cs.session_date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00'))
         AND cs.status = 'ACTIVE'
         AND TIME(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')) BETWEEN cs.start_time AND cs.end_time
       ORDER BY cs.start_time
       LIMIT 1`,
      [studentId, courseId, row.classroomId],
    ),
    db.execute<
      (RowDataPacket & {
        id: number;
        dayOfWeek: number;
        periodName: string | null;
        startTime: string;
        endTime: string;
      })[]
    >(
      `SELECT id,day_of_week dayOfWeek,period_name periodName,TIME_FORMAT(start_time,'%H:%i') startTime,TIME_FORMAT(end_time,'%H:%i') endTime FROM schedules WHERE subject_id=? AND is_active=1 ORDER BY day_of_week,start_time`,
      [courseId],
    ),
  ]);

  const rawStats = statRows[0] || {
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    leaveCount: 0,
  };
  const total = Number(rawStats.total) || 0;
  const present = Number(rawStats.present) || 0;
  const late = Number(rawStats.late) || 0;
  const absent = Number(rawStats.absent) || 0;
  const leave = Number(rawStats.leaveCount) || 0;
  const rate = total
    ? Number((((present + late) * 100) / total).toFixed(1))
    : 0;

  const active = activeSessions[0]
    ? {
        id: activeSessions[0].id,
        startTime: activeSessions[0].startTime,
        endTime: activeSessions[0].endTime,
        lateAfter: activeSessions[0].lateAfter,
        alreadyCheckedIn: Boolean(activeSessions[0].alreadyCheckedIn),
      }
    : null;
  const schedules: StudentCourseSchedule[] = scheduleRows.map((schedule) => ({
    ...schedule,
    day: scheduleDayName(schedule.dayOfWeek),
    periodName: schedule.periodName || "คาบเรียน",
  }));
  const firstSchedule = schedules[0];

  return {
    authorized: true,
    course: {
      id: row.id,
      code: row.code,
      name: row.name,
      teacher: row.teacher,
      days: schedules.length
        ? [...new Set(schedules.map((schedule) => schedule.day))]
        : normalizeStudyDays(row.studyDays),
      schedules,
      startTime: firstSchedule?.startTime ?? row.startTime,
      endTime: firstSchedule?.endTime ?? row.endTime,
      room: row.room,
      credits: row.credits,
      description: row.description || "",
      semester: row.semester,
      academicYear: row.academicYear,
      gradeLevel: row.gradeLevel || "",
      className: row.className,
      stats: {
        total,
        present,
        late,
        absent,
        leave,
        rate,
      },
      recentAttendance: recentRows,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: pagination.totalPages,
        totalItems: historyTotal,
      },
      activeSession: active,
    },
  };
}

export type StudentIssue = {
  id: number;
  createdAt: string;
  subject: string;
  issueType: string;
  status: "รอตรวจสอบ" | "กำลังตรวจสอบ" | "เสร็จสิ้น" | "ปฏิเสธ";
  resolution: string;
  hasAttachment: boolean;
};
export async function getStudentIssues(studentId: number): Promise<StudentIssue[]> {
  const [rows] = await db.execute<(RowDataPacket & StudentIssue)[]>(
    `SELECT r.id,DATE_FORMAT(r.created_at,'%d/%m/%Y %H:%i') createdAt,COALESCE(s.subject_name,'ไม่ระบุรายวิชา') subject,r.issue_type issueType,CASE r.status WHEN 'PENDING' THEN 'รอตรวจสอบ' WHEN 'REVIEWING' THEN 'กำลังตรวจสอบ' WHEN 'COMPLETED' THEN 'เสร็จสิ้น' ELSE 'ปฏิเสธ' END status,COALESCE(r.resolution,'ยังไม่มีผลการดำเนินการ') resolution,(r.attachment_data IS NOT NULL OR EXISTS(SELECT 1 FROM attendance_issue_attachments att WHERE att.report_id=r.id)) hasAttachment FROM attendance_issue_reports r LEFT JOIN subjects s ON s.id=r.subject_id WHERE r.student_id=? ORDER BY r.created_at DESC LIMIT 100`,
    [studentId],
  );
  return rows.map((x) => ({ ...x, hasAttachment: Boolean(x.hasAttachment) }));
}
