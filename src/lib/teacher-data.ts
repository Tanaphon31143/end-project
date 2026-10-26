import "server-only";
import type { AttendanceStatus } from "@prisma/client";
import type { RowDataPacket } from "mysql2/promise";
import { cache } from "react";
import { nameInitials } from "@/lib/name-initials";
import {
  getSchoolTerm,
  termEnrollmentWhere,
  type AcademicTerm,
} from "@/lib/academic-term";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";

const bangkokDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
const dateValue = (value: string) => new Date(`${value}T00:00:00.000Z`);
const timeText = (date: Date | null) =>
  date
    ? `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`
    : "-";

function lastWeekdays(count: number) {
  const dates: string[] = [];
  const cursor = new Date();
  while (dates.length < count) {
    const key = bangkokDate(cursor);
    const day = dateValue(key).getUTCDay();
    if (day !== 0 && day !== 6) dates.unshift(key);
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

async function loadTeacherCourses(
  teacherId: number,
  academicYear: string,
  semester: number,
  includeBothSemesters: boolean,
) {
  const dayNames = [
    "",
    "วันจันทร์",
    "วันอังคาร",
    "วันพุธ",
    "วันพฤหัสบดี",
    "วันศุกร์",
    "วันเสาร์",
    "วันอาทิตย์",
  ];
  const subjectsPromise = prisma.subject.findMany({
    where: {
      teacherId,
      isActive: true,
      academicYear,
      ...(includeBothSemesters ? {} : { semester }),
    },
    include: {
      classroom: {
        select: { id: true, name: true, level: true },
      },
    },
    orderBy: { subjectCode: "asc" },
  });
  type ScheduleRow = RowDataPacket & {
    id: number;
    subjectId: number;
    dayOfWeek: number;
    periodName: string | null;
    startTime: string;
    endTime: string;
  };
  const scheduleRowsPromise = db
    .execute<ScheduleRow[]>(
      `SELECT sc.id,sc.subject_id subjectId,sc.day_of_week dayOfWeek,sc.period_name periodName,TIME_FORMAT(sc.start_time,'%H:%i') startTime,TIME_FORMAT(sc.end_time,'%H:%i') endTime FROM schedules sc JOIN subjects sb ON sb.id=sc.subject_id WHERE sb.teacher_id=? AND sb.academic_year=? AND sc.is_active=1 ORDER BY sc.day_of_week,sc.start_time`,
      [teacherId, academicYear],
    )
    .then(([rows]) => rows);
  const [subjects, scheduleRows] = await Promise.all([
    subjectsPromise,
    scheduleRowsPromise,
  ]);
  const classroomIds = [
    ...new Set(
      subjects
        .map((subject) => subject.classroomId)
        .filter((id): id is number => id !== null),
    ),
  ];
  const enrollments = classroomIds.length
    ? await prisma.studentTermEnrollment.findMany({
        where: {
          academicYear,
          ...(includeBothSemesters ? {} : { semester }),
          classroomId: { in: classroomIds },
          student: { status: "ACTIVE" },
        },
        select: { classroomId: true, semester: true },
      })
    : [];
  const studentCounts = new Map<string, number>();
  for (const enrollment of enrollments) {
    const key = `${enrollment.classroomId}:${enrollment.semester}`;
    studentCounts.set(key, (studentCounts.get(key) ?? 0) + 1);
  }
  return subjects.map((subject) => {
    const schedules = scheduleRows
      .filter((schedule) => schedule.subjectId === subject.id)
      .map((schedule) => ({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        day: dayNames[schedule.dayOfWeek] ?? `วันที่ ${schedule.dayOfWeek}`,
        periodName: schedule.periodName ?? "คาบเรียน",
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      }));
    const first = schedules[0];
    return {
      id: subject.id,
      code: subject.subjectCode,
      name: subject.subjectName,
      room: subject.classroom?.name ?? "ยังไม่กำหนด",
      gradeLevel: subject.gradeLevel ?? subject.classroom?.level ?? "ยังไม่ระบุ",
      location: subject.location ?? "",
      semester: subject.semester,
      academicYear: subject.academicYear,
      description: subject.description ?? "",
      attendanceMode: subject.attendanceMode,
      classroomId: subject.classroomId,
      day: schedules.length
        ? [...new Set(schedules.map((item) => item.day))].join(", ")
        : (subject.studyDays ?? "ยังไม่กำหนด"),
      startTime: first?.startTime ?? timeText(subject.startTime),
      endTime: first?.endTime ?? timeText(subject.endTime),
      time: first
        ? schedules
            .map((item) => `${item.day} ${item.startTime}–${item.endTime}`)
            .join(" • ")
        : `${timeText(subject.startTime)}–${timeText(subject.endTime)}`,
      students: subject.classroomId
        ? studentCounts.get(`${subject.classroomId}:${subject.semester}`) ?? 0
        : 0,
      schedules,
    };
  });
}

const loadTeacherCoursesCached = cache(loadTeacherCourses);

export async function getTeacherCourses(
  teacherId: number,
  term?: AcademicTerm,
  includeBothSemesters = false,
) {
  const selectedTerm = term ?? (await getSchoolTerm());
  return loadTeacherCoursesCached(
    teacherId,
    selectedTerm.academicYear,
    selectedTerm.semester,
    includeBothSemesters,
  );
}

export async function getTeacherDashboard(teacherId: number) {
  const term = await getSchoolTerm();
  const todayKey = bangkokDate(),
    today = dateValue(todayKey);
  const [courses, sessions, todayAttendance] = await Promise.all([
    getTeacherCourses(teacherId, term),
    prisma.checkInSession.findMany({
      where: {
        sessionDate: today,
        subject: { teacherId, academicYear: term.academicYear, semester: term.semester },
      },
      include: {
        subject: { include: { classroom: true } },
        attendance: { select: { status: true } },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.attendanceRecord.findMany({
      where: {
        attendanceDate: today,
        subject: { teacherId, academicYear: term.academicYear, semester: term.semester },
      },
      select: { status: true },
    }),
  ]);
  const subjectIds = courses.map((course) => course.id);
  const classroomIds = [
    ...new Set(
      courses
        .map((course) => course.classroomId)
        .filter((id): id is number => id !== null),
    ),
  ];
  const days = lastWeekdays(10);
  const [studentCount, history] = await Promise.all([
    classroomIds.length
      ? prisma.studentTermEnrollment.count({
          where: {
            academicYear: term.academicYear,
            semester: term.semester,
            classroomId: { in: classroomIds },
            student: { status: "ACTIVE" },
          },
        })
      : Promise.resolve(0),
    subjectIds.length
      ? prisma.attendanceRecord.findMany({
          where: {
            subjectId: { in: subjectIds },
            attendanceDate: {
              gte: dateValue(days[0]),
              lte: dateValue(days.at(-1)!),
            },
          },
          select: { attendanceDate: true, status: true },
        })
      : Promise.resolve([]),
  ]);
  const counts: Record<AttendanceStatus, number> = {
    PRESENT: 0,
    LATE: 0,
    ABSENT: 0,
    LEAVE: 0,
  };
  todayAttendance.forEach((item) => counts[item.status]++);
  const expected = sessions.reduce(
    (sum, session) =>
      sum +
      (courses.find((course) => course.id === session.subjectId)
        ?.students ?? 0),
    0,
  );
  const percent = (value: number) =>
    expected
      ? `${((value / expected) * 100).toFixed(1)}% วันนี้`
      : "0.0% วันนี้";
  const current = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const sessionRows = sessions.map((session) => {
    const checked = session.attendance.filter(
      (item) => item.status === "PRESENT" || item.status === "LATE",
    ).length;
    const total =
      courses.find((course) => course.id === session.subjectId)
        ?.students ?? 0;
    const start = timeText(session.startTime);
    const state =
      session.status === "CLOSED"
        ? "closed"
        : current < start
          ? "upcoming"
          : "active";
    return {
      id: String(session.id),
      href: `/teacher/scan/${session.id}`,
      time: `${start} - ${timeText(session.endTime)}`,
      code: session.subject.subjectCode,
      name: `${session.subject.subjectName} ${session.subject.classroom?.name ?? ""}`,
      subjectName: session.subject.subjectName,
      room: session.subject.classroom?.name ?? "",
      count: `${checked}/${total}`,
      status: state,
      label:
        state === "closed"
          ? "เสร็จสิ้น"
          : state === "active"
            ? "กำลังดำเนินการ"
            : "ยังไม่เริ่ม",
    };
  });
  const chartWindow = days.map((date) => {
    const daily = history.filter(
      (item) => bangkokDate(item.attendanceDate) === date,
    );
    return {
      day: new Intl.DateTimeFormat("th-TH", {
        weekday: "long",
        timeZone: "UTC",
      }).format(dateValue(date)),
      present: daily.filter((item) => item.status === "PRESENT").length,
      late: daily.filter((item) => item.status === "LATE").length,
      absent: daily.filter((item) => item.status === "ABSENT").length,
      leave: daily.filter((item) => item.status === "LEAVE").length,
      total: daily.length,
      attendanceRate: daily.length
        ? Number(
            ((daily.filter((item) => item.status === "PRESENT" || item.status === "LATE").length / daily.length) * 100).toFixed(1),
          )
        : 0,
    };
  });
  const bangkokWeekday = (() => {
    const day = dateValue(todayKey).getUTCDay();
    return day === 0 ? 7 : day;
  })();
  const matchedSessionIds = new Set<string>();
  const scheduleRows = courses.flatMap((course) =>
    course.schedules
      .filter((schedule) => schedule.dayOfWeek === bangkokWeekday)
      .map((schedule) => {
        const session = sessions.find(
          (item) =>
            item.subjectId === course.id &&
            timeText(item.startTime) === schedule.startTime,
        );
        if (session) matchedSessionIds.add(String(session.id));
        const sessionRow = sessionRows.find(
          (item) => item.id === String(session?.id ?? ""),
        );
        return (
          sessionRow ?? {
            id: `schedule-${schedule.id}`,
            href: "/teacher/courses",
            time: `${schedule.startTime} - ${schedule.endTime}`,
            code: course.code,
            name: course.name,
            subjectName: course.name,
            room: course.room,
            count: `0/${course.students}`,
            status: "upcoming",
            label: "ยังไม่เริ่ม",
          }
        );
      }),
  );
  const todayRows = [
    ...scheduleRows,
    ...sessionRows.filter((item) => !matchedSessionIds.has(item.id)),
  ].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const chart = chartWindow.slice(-5);
  const previousChart = chartWindow.slice(0, 5);
  const averageRate = (items: typeof chart) => {
    const recorded = items.filter((item) => item.total > 0);
    return recorded.length
      ? recorded.reduce((sum, item) => sum + item.attendanceRate, 0) / recorded.length
      : 0;
  };
  const currentAverage = averageRate(chart);
  const previousAverage = averageRate(previousChart);
  return {
    courses: courses.length,
    students: studentCount,
    counts,
    details: {
      present: percent(counts.PRESENT),
      late: percent(counts.LATE),
      absent: percent(counts.ABSENT),
      leave: percent(counts.LEAVE),
    },
    sessions: todayRows,
    chart,
    weeklySummary: {
      average: Number(currentAverage.toFixed(1)),
      change: previousAverage
        ? Number((currentAverage - previousAverage).toFixed(1))
        : null,
    },
  };
}

export type TeacherIdentity = {
  id: number;
  name: string;
  email: string;
  phone: string;
  code: string;
  position: string;
  initials: string;
  hasProfileImage: boolean;
};

async function loadTeacherIdentity(
  teacherId: number,
): Promise<TeacherIdentity | null> {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId, status: "ACTIVE" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      teacherCode: true,
      department: true,
    },
  });
  if (!teacher) return null;
  let hasProfileImage = false;
  try {
    const [rows] = await db.execute<(RowDataPacket & { hasImage: number })[]>(
      `SELECT (profile_image IS NOT NULL) hasImage FROM teachers WHERE id=? LIMIT 1`,
      [teacherId],
    );
    hasProfileImage = Boolean(rows[0]?.hasImage);
  } catch {
    /* profile image columns are added by the teacher schema migration */
  }
  return {
    id: teacher.id,
    name: teacher.fullName,
    email: teacher.email,
    phone: teacher.phone ?? "",
    code: teacher.teacherCode ?? "ยังไม่ระบุ",
    position: teacher.department ?? "ครูผู้สอน",
    initials: nameInitials(teacher.fullName),
    hasProfileImage,
  };
}

export const getTeacherIdentity = cache(loadTeacherIdentity);

export type TeacherHistoryFilters = {
  subjectId?: number;
  academicYear?: string;
  semester?: number;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getTeacherHistory(
  teacherId: number,
  filters: TeacherHistoryFilters = {},
) {
  const from =
    filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)
      ? dateValue(filters.from)
      : undefined;
  const to =
    filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)
      ? dateValue(filters.to)
      : undefined;
  const search = filters.search?.trim();
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));
  const page = Math.max(1, filters.page ?? 1);
  const where = {
    subject: {
      teacherId,
      ...(filters.subjectId ? { id: filters.subjectId } : {}),
      ...(filters.academicYear ? { academicYear: filters.academicYear } : {}),
      ...(filters.semester ? { semester: filters.semester } : {}),
    },
    ...(from || to
      ? {
          sessionDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          attendance: {
            some: {
              student: {
                OR: [
                  { fullName: { contains: search } },
                  { studentCode: { contains: search } },
                ],
              },
            },
          },
        }
      : {}),
  };
  const [total, sessions] = await Promise.all([
    prisma.checkInSession.count({ where }),
    prisma.checkInSession.findMany({
      where,
      include: {
        subject: { include: { classroom: true } },
        attendance: { select: { status: true } },
      },
      orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const rows = sessions.map((session) => {
    const counts: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      LATE: 0,
      ABSENT: 0,
      LEAVE: 0,
    };
    session.attendance.forEach((row) => counts[row.status]++);
    return {
      id: String(session.id),
      date: new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(session.sessionDate),
      subject: `${session.subject.subjectCode} ${session.subject.subjectName}`,
      room: session.subject.classroom?.name ?? "ยังไม่ระบุ",
      status: session.status,
      counts,
    };
  });
  return {
    rows,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTeacherSessionDetail(
  teacherId: number,
  rawSessionId: string,
) {
  let sessionId: bigint;
  try {
    sessionId = BigInt(rawSessionId);
  } catch {
    return null;
  }
  const session = await prisma.checkInSession.findFirst({
    where: { id: sessionId, subject: { teacherId } },
    include: {
      subject: { include: { classroom: true } },
      attendance: {
        select: {
          studentId: true,
          status: true,
          checkInTime: true,
          confidence: true,
        },
        orderBy: { student: { studentCode: "asc" } },
      },
    },
  });
  if (!session) return null;
  const recordedStudentIds = [
    ...new Set(session.attendance.map((row) => row.studentId)),
  ];
  const students = await prisma.student.findMany({
    where: {
      OR: [
        {
          status: "ACTIVE",
          termEnrollments: {
            some: termEnrollmentWhere(
              {
                academicYear: session.subject.academicYear,
                semester: session.subject.semester,
              },
              session.classroomId,
            ),
          },
        },
        ...(recordedStudentIds.length
          ? [{ id: { in: recordedStudentIds } }]
          : []),
      ],
    },
    select: { id: true, studentCode: true, fullName: true },
    orderBy: { studentCode: "asc" },
  });
  const attendance = new Map(
    session.attendance.map((row) => [row.studentId, row]),
  );
  return {
    id: String(session.id),
    date: new Intl.DateTimeFormat("th-TH", {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(session.sessionDate),
    subject: `${session.subject.subjectCode} ${session.subject.subjectName}`,
    room: session.subject.classroom?.name ?? "ยังไม่ระบุ",
    time: `${timeText(session.startTime)}–${timeText(session.endTime)}`,
    status: session.status,
    students: students.map((student) => {
      const row = attendance.get(student.id);
      return {
        id: student.id,
        code: student.studentCode,
        name: student.fullName,
        status: row?.status ?? null,
        checkInTime: row?.checkInTime
          ? new Intl.DateTimeFormat("th-TH", {
              timeStyle: "medium",
              timeZone: "Asia/Bangkok",
            }).format(row.checkInTime)
          : "-",
        confidence:
          row?.confidence === null || row?.confidence === undefined
            ? null
            : Number(row.confidence),
      };
    }),
  };
}

export async function getTeacherNotifications(teacherId: number) {
  type NotificationRow = RowDataPacket & {
    id: string;
    title: string;
    detail: string;
    href: string | null;
    isRead: number;
    createdAt: string;
  };
  const [rows] = await db.execute<NotificationRow[]>(
    `SELECT CAST(id AS CHAR) id,title,message detail,href,is_read isRead,DATE_FORMAT(created_at,'%d/%m/%Y %H:%i') createdAt FROM teacher_notifications WHERE teacher_id=? ORDER BY created_at DESC,id DESC LIMIT 20`,
    [teacherId],
  );
  return rows.map((row) => ({
    ...row,
    href: row.href ?? "/teacher/dashboard",
    isRead: Boolean(row.isRead),
  }));
}
