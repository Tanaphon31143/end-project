import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";

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

type StudentRow = RowDataPacket & {
  id: number;
  name: string;
  code: string;
  className: string;
  classLevel: string;
  classId: number | null;
  faceReady: number;
  hasProfileImage: number;
};
type CountRow = RowDataPacket & {
  subjects: number;
  present: number;
  late: number;
  absent: number;
  leaveCount: number;
  total: number;
};

export async function getStudentDashboardData(
  studentId: number,
): Promise<StudentDashboardData | null> {
  const [[students], [settings], [counts], [today], [recent]] =
    await Promise.all([
      db.execute<StudentRow[]>(
        `SELECT s.id,s.full_name name,s.student_code code,s.class_id classId,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(c.level,'') classLevel,EXISTS(SELECT 1 FROM face_data f WHERE f.student_id=s.id AND f.status='READY') faceReady,(s.profile_image IS NOT NULL) hasProfileImage FROM students s LEFT JOIN classrooms c ON c.id=s.class_id WHERE s.id=? AND s.status='ACTIVE' LIMIT 1`,
        [studentId],
      ),
      db.execute<
        (RowDataPacket & { semester: number; academicYear: string })[]
      >(
        `SELECT semester,academic_year academicYear FROM school_settings ORDER BY id LIMIT 1`,
      ),
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
        `SELECT sb.id,sb.subject_code code,sb.subject_name name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COALESCE(sb.location,c.name,'ยังไม่ระบุ') room,COALESCE(TIME_FORMAT(sb.start_time,'%H:%i'),'--:--') startTime,COALESCE(TIME_FORMAT(sb.end_time,'%H:%i'),'--:--') endTime FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id LEFT JOIN teachers t ON t.id=sb.teacher_id LEFT JOIN classrooms c ON c.id=sb.classroom_id WHERE st.id=? AND sb.is_active=1 AND (sb.study_days IS NULL OR sb.study_days='' OR FIND_IN_SET(ELT(WEEKDAY(CURRENT_DATE)+1,'จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'),sb.study_days)) ORDER BY sb.start_time LIMIT 6`,
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
  const student = students[0];
  if (!student) return null;
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
      ...student,
      faceReady: Boolean(student.faceReady),
      hasProfileImage: Boolean(student.hasProfileImage),
    },
    term: settings[0] || { semester: 1, academicYear: "2569" },
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

export type StudentIdentity={id:number;name:string;code:string;email:string;phone:string;birthday:string;address:string;hasProfileImage:boolean;className:string;classLevel:string;classNumber:number|null;initials:string};
export async function getStudentIdentity(studentId:number):Promise<StudentIdentity|null>{const[rows]=await db.execute<(RowDataPacket&Omit<StudentIdentity,"initials"|"hasProfileImage">&{hasProfileImage:number})[]>(`SELECT s.id,s.full_name name,s.student_code code,s.email,COALESCE(s.phone,'') phone,COALESCE(DATE_FORMAT(s.birthday,'%Y-%m-%d'),'') birthday,COALESCE(s.address,'') address,(s.profile_image IS NOT NULL) hasProfileImage,COALESCE(c.name,'ยังไม่ระบุ') className,COALESCE(c.level,'') classLevel,s.class_number classNumber FROM students s LEFT JOIN classrooms c ON c.id=s.class_id WHERE s.id=? AND s.status='ACTIVE' LIMIT 1`,[studentId]);const item=rows[0];return item?{...item,hasProfileImage:Boolean(item.hasProfileImage),initials:item.name.replace(/^(นาย|นางสาว|เด็กชาย|เด็กหญิง)/,"").trim().slice(0,2)}:null}

export type StudentCourse={id:number;code:string;name:string;teacher:string;days:string[];startTime:string;endTime:string;room:string;credits:string;description:string};
export async function getStudentCourses(studentId:number):Promise<StudentCourse[]>{const[rows]=await db.execute<(RowDataPacket&Omit<StudentCourse,"days">&{studyDays:string})[]>(`SELECT sb.id,sb.subject_code code,sb.subject_name name,COALESCE(t.full_name,'ยังไม่กำหนด') teacher,COALESCE(sb.study_days,'') studyDays,COALESCE(TIME_FORMAT(sb.start_time,'%H:%i'),'--:--') startTime,COALESCE(TIME_FORMAT(sb.end_time,'%H:%i'),'--:--') endTime,COALESCE(sb.location,c.name,'ยังไม่ระบุ') room,CAST(sb.credits AS CHAR) credits,COALESCE(sb.description,'') description FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id LEFT JOIN teachers t ON t.id=sb.teacher_id LEFT JOIN classrooms c ON c.id=sb.classroom_id WHERE st.id=? AND st.status='ACTIVE' AND sb.is_active=1 ORDER BY sb.start_time,sb.subject_code`,[studentId]);return rows.map(({studyDays,...row})=>({...row,days:studyDays.split(",").map(x=>x.trim()).filter(Boolean)}))}

export type StudentAttendance={id:number;date:string;subjectId:number|null;subjectCode:string;subject:string;classTime:string;checkIn:string;status:"มาเรียน"|"สาย"|"ขาด"|"ลา";note:string};
export async function getStudentAttendance(studentId:number,filters:{from?:string;to?:string;subjectId?:number;status?:string}={}){const where=["a.student_id=?"],params:(string|number)[]=[studentId];if(filters.from){where.push("a.attendance_date>=?");params.push(filters.from)}if(filters.to){where.push("a.attendance_date<=?");params.push(filters.to)}if(filters.subjectId){where.push("a.subject_id=?");params.push(filters.subjectId)}const allowed:Record<string,string>={present:"PRESENT",late:"LATE",absent:"ABSENT",leave:"LEAVE"};if(filters.status&&allowed[filters.status]){where.push("a.status=?");params.push(allowed[filters.status])}const[rows]=await db.execute<(RowDataPacket&StudentAttendance)[]>(`SELECT a.id,DATE_FORMAT(a.attendance_date,'%d/%m/%Y') date,a.subject_id subjectId,COALESCE(sb.subject_code,'-') subjectCode,COALESCE(sb.subject_name,'ไม่ระบุรายวิชา') subject,CONCAT(COALESCE(TIME_FORMAT(sb.start_time,'%H:%i'),'--:--'),'–',COALESCE(TIME_FORMAT(sb.end_time,'%H:%i'),'--:--')) classTime,COALESCE(TIME_FORMAT(a.check_in_time,'%H:%i'),'-') checkIn,CASE a.status WHEN 'PRESENT' THEN 'มาเรียน' WHEN 'LATE' THEN 'สาย' WHEN 'ABSENT' THEN 'ขาด' ELSE 'ลา' END status,CASE WHEN a.status='LATE' THEN 'มาสาย' WHEN a.status='ABSENT' THEN 'ไม่พบการเช็คชื่อ' WHEN a.status='LEAVE' THEN 'ลา' ELSE '-' END note FROM attendance_records a LEFT JOIN subjects sb ON sb.id=a.subject_id WHERE ${where.join(" AND ")} ORDER BY a.attendance_date DESC,a.check_in_time DESC LIMIT 500`,params);return rows}

export type StudentStats={summary:{present:number;late:number;absent:number;leave:number;total:number;rate:number};monthly:Array<{m:string;v:number}>;weekly:Array<{d:string;v:number}>;subjects:Array<{name:string;value:number;total:number;present:number;late:number;absent:number;leave:number}>};
export async function getStudentStatistics(studentId:number):Promise<StudentStats>{const[[summary],[monthly],[weekly],[subjectRows]]=await Promise.all([db.execute<(RowDataPacket&{present:number;late:number;absent:number;leaveCount:number;total:number})[]>(`SELECT SUM(status='PRESENT') present,SUM(status='LATE') late,SUM(status='ABSENT') absent,SUM(status='LEAVE') leaveCount,COUNT(*) total FROM attendance_records WHERE student_id=?`,[studentId]),db.execute<(RowDataPacket&{m:string;v:number})[]>(`SELECT DATE_FORMAT(attendance_date,'%m/%Y') m,ROUND(100*SUM(status IN ('PRESENT','LATE'))/COUNT(*),1) v FROM attendance_records WHERE student_id=? AND attendance_date>=CURRENT_DATE-INTERVAL 5 MONTH GROUP BY DATE_FORMAT(attendance_date,'%m/%Y') ORDER BY MIN(attendance_date)`,[studentId]),db.execute<(RowDataPacket&{d:string;v:number})[]>(`SELECT DATE_FORMAT(attendance_date,'%d/%m') d,SUM(status IN ('PRESENT','LATE')) v FROM attendance_records WHERE student_id=? AND attendance_date>=CURRENT_DATE-INTERVAL 6 DAY GROUP BY attendance_date ORDER BY attendance_date`,[studentId]),db.execute<(RowDataPacket&{name:string;value:number;total:number;present:number;late:number;absent:number;leaveCount:number})[]>(`SELECT COALESCE(sb.subject_name,'ไม่ระบุรายวิชา') name,ROUND(100*SUM(a.status IN ('PRESENT','LATE'))/COUNT(*),1) value,COUNT(*) total,SUM(a.status='PRESENT') present,SUM(a.status='LATE') late,SUM(a.status='ABSENT') absent,SUM(a.status='LEAVE') leaveCount FROM attendance_records a LEFT JOIN subjects sb ON sb.id=a.subject_id WHERE a.student_id=? GROUP BY a.subject_id,sb.subject_name ORDER BY sb.subject_name`,[studentId])]);const s=summary[0]||{present:0,late:0,absent:0,leaveCount:0,total:0},subjects=subjectRows.map(({leaveCount,...subject})=>({...subject,leave:leaveCount}));return{summary:{present:Number(s.present)||0,late:Number(s.late)||0,absent:Number(s.absent)||0,leave:Number(s.leaveCount)||0,total:Number(s.total)||0,rate:s.total?Number((((Number(s.present)||0)+(Number(s.late)||0))*100/Number(s.total)).toFixed(1)):0},monthly,weekly,subjects}}

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
  registeredByName: string;
  registeredByRole: string;
  deviceType: string;
  deviceName: string;
  browser: string;
  registrationIp: string;
  cameraType: string;
  samples: FaceSampleItem[];
  sampleIds: number[];
} | null;

function maskIp(ip?: string | null): string {
  if (!ip || ip === "unknown") return "ไม่ระบุ";
  if (ip.includes(":")) {
    // IPv6
    const parts = ip.split(":");
    return parts.slice(0, 3).join(":") + ":****:****";
  }
  // IPv4
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return ip.slice(0, Math.min(6, ip.length)) + "***";
}

export async function getStudentFaceData(studentId: number): Promise<StudentFaceData> {
  const [[faces], [samples]] = await Promise.all([
    db.execute<
      (RowDataPacket & {
        status: "READY" | "NEEDS_IMAGES" | "INACTIVE";
        imageCount: number;
        registeredAt: string;
        updatedAt: string;
        registeredByName: string;
        registeredByRole: string;
        deviceType: string;
        deviceName: string;
        browser: string;
        registrationIp: string | null;
        cameraType: string;
      })[]
    >(
      `SELECT status, image_count imageCount,
              DATE_FORMAT(registered_at, '%d/%m/%Y %H:%i') registeredAt,
              DATE_FORMAT(updated_at, '%d/%m/%Y %H:%i') updatedAt,
              COALESCE(registered_by_name, 'ผู้ดูแลระบบ') registeredByName,
              COALESCE(registered_by_role, 'ADMIN') registeredByRole,
              COALESCE(device_type, 'ไม่ระบุอุปกรณ์') deviceType,
              COALESCE(device_name, 'ไม่ระบุรุ่น/อุปกรณ์') deviceName,
              COALESCE(browser, 'ไม่ระบุเบราว์เซอร์') browser,
              registration_ip registrationIp,
              COALESCE(camera_type, 'กล้องเว็บแคม / มาตรฐาน') cameraType
       FROM face_data
       WHERE student_id = ?
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
    registrationIp: maskIp(face.registrationIp),
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
  startTime: string;
  endTime: string;
  room: string;
  credits: string;
  description: string;
  semester: number;
  academicYear: string;
  gradeLevel: string;
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
    checkIn: string;
    status: "มาเรียน" | "สาย" | "ขาด" | "ลา";
    confidence: number | null;
  }>;
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

  // Fetch stats and recent attendance for this course
  const [[statRows], [recentRows], [activeSessions]] = await Promise.all([
    db.execute<
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
    ),
    db.execute<
      (RowDataPacket & {
        id: number;
        date: string;
        checkIn: string;
        status: "มาเรียน" | "สาย" | "ขาด" | "ลา";
        confidence: number | null;
      })[]
    >(
      `SELECT id,
              DATE_FORMAT(attendance_date, '%d/%m/%Y') date,
              COALESCE(TIME_FORMAT(check_in_time, '%H:%i'), '-') checkIn,
              CASE status
                WHEN 'PRESENT' THEN 'มาเรียน'
                WHEN 'LATE' THEN 'สาย'
                WHEN 'ABSENT' THEN 'ขาด'
                ELSE 'ลา'
              END status,
              confidence
       FROM attendance_records
       WHERE student_id = ? AND subject_id = ?
       ORDER BY attendance_date DESC, check_in_time DESC
       LIMIT 15`,
      [studentId, courseId],
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
         AND cs.session_date = CURRENT_DATE AND cs.status = 'ACTIVE'
         AND CURRENT_TIME <= cs.end_time
       ORDER BY cs.start_time
       LIMIT 1`,
      [studentId, courseId, row.classroomId],
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

  return {
    authorized: true,
    course: {
      id: row.id,
      code: row.code,
      name: row.name,
      teacher: row.teacher,
      days: (row.studyDays || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      startTime: row.startTime,
      endTime: row.endTime,
      room: row.room,
      credits: row.credits,
      description: row.description || "",
      semester: row.semester,
      academicYear: row.academicYear,
      gradeLevel: row.gradeLevel || "",
      stats: {
        total,
        present,
        late,
        absent,
        leave,
        rate,
      },
      recentAttendance: recentRows.map((r) => ({
        ...r,
        confidence: r.confidence !== null ? Number(r.confidence) : null,
      })),
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
    `SELECT r.id,DATE_FORMAT(r.created_at,'%d/%m/%Y %H:%i') createdAt,COALESCE(s.subject_name,'ไม่ระบุรายวิชา') subject,r.issue_type issueType,CASE r.status WHEN 'PENDING' THEN 'รอตรวจสอบ' WHEN 'REVIEWING' THEN 'กำลังตรวจสอบ' WHEN 'COMPLETED' THEN 'เสร็จสิ้น' ELSE 'ปฏิเสธ' END status,COALESCE(r.resolution,'ยังไม่มีผลการดำเนินการ') resolution,(r.attachment_data IS NOT NULL) hasAttachment FROM attendance_issue_reports r LEFT JOIN subjects s ON s.id=r.subject_id WHERE r.student_id=? ORDER BY r.created_at DESC LIMIT 100`,
    [studentId],
  );
  return rows.map((x) => ({ ...x, hasAttachment: Boolean(x.hasAttachment) }));
}
