"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Boxes,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  Hash,
  History,
  LoaderCircle,
  MoreVertical,
  Plus,
  RotateCcw,
  School,
  Search,
  Utensils,
  UsersRound,
  X,
} from "lucide-react";
import type { Course } from "@/components/teacher/CourseCard";
import { EmptyState } from "@/components/teacher/EmptyState";

export type CourseSchedule = {
  id: number;
  dayOfWeek: number;
  day: string;
  periodName: string;
  startTime: string;
  endTime: string;
};

export type TeacherCourse = Omit<Course, "color"> & {
  classroomId: number | null;
  location: string;
  gradeLevel: string;
  semester: number;
  academicYear: string;
  description: string;
  attendanceMode: string;
  startTime: string;
  endTime: string;
  schedules: CourseSchedule[];
};

export type TimetableScheduleItem = CourseSchedule & {
  key: string;
  courseCode: string;
  courseName: string;
  room: string;
  gradeLevel: string;
  location: string;
  courseId: number;
};

const weekDays = [
  "",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
  "วันอาทิตย์",
];

const weekdays = [1, 2, 3, 4, 5];

const lunchTimeSlot = "11:30-12:45";

const teachingTimeSlots = [
  "08:30-09:30",
  "09:30-10:30",
  "10:30-11:30",
  "12:45-13:30",
  "13:30-14:20",
  "14:20-15:30",
];

const defaultTimeSlots = [
  ...teachingTimeSlots.slice(0, 3),
  lunchTimeSlot,
  ...teachingTimeSlots.slice(3),
];

const lunchSlotIndex = defaultTimeSlots.indexOf(lunchTimeSlot);

type SchedulePlacement = {
  startIndex: number;
  colSpan: number;
};

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const nextScheduleDate = (dayOfWeek?: number) => {
  if (!dayOfWeek) return today();
  const date = new Date(`${today()}T12:00:00+07:00`);
  const current = date.getDay() || 7;
  date.setDate(date.getDate() + ((dayOfWeek - current + 7) % 7));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const mondayOfWeek = (value = new Date()) => {
  const date = new Date(value);
  const shift = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - shift);
  date.setHours(12, 0, 0, 0);
  return date;
};

const formatWeekRange = (start: Date) => {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startDay = start.getDate();
  const endDay = end.getDate();

  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  const startMonth = thaiMonths[start.getMonth()];
  const endMonth = thaiMonths[end.getMonth()];
  const endYear = end.getFullYear() + 543;

  if (start.getMonth() === end.getMonth()) {
    return `${startDay} - ${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
};

const schedulePlacement = (schedule: {
  startTime: string;
  endTime: string;
}): SchedulePlacement | null => {
  const start = schedule.startTime.slice(0, 5);
  const end = schedule.endTime.slice(0, 5);
  const matchingSlots = teachingTimeSlots
    .map((slot) => {
      const [slotStart, slotEnd] = slot.split("-");
      return start < slotEnd && end > slotStart;
    })
    .map((matches, teachingIndex) => ({
      matches,
      tableIndex:
        teachingIndex < lunchSlotIndex ? teachingIndex : teachingIndex + 1,
    }))
    .filter((item) => item.matches)
    .map((item) => item.tableIndex);

  if (!matchingSlots.length) return null;

  const startIndex = matchingSlots[0];
  let endIndex = matchingSlots[matchingSlots.length - 1];

  if (startIndex < lunchSlotIndex && endIndex > lunchSlotIndex) {
    endIndex = lunchSlotIndex - 1;
  }

  return { startIndex, colSpan: Math.max(1, endIndex - startIndex + 1) };
};

const scheduleTimeSlot = (schedule: {
  startTime: string;
  endTime: string;
}) =>
  teachingTimeSlots.find((slot) => {
    const [slotStart, slotEnd] = slot.split("-");
    return (
      schedule.startTime.slice(0, 5) < slotEnd &&
      schedule.endTime.slice(0, 5) > slotStart
    );
  }) ?? teachingTimeSlots[0];

/* -------------------------------------------------------------------------- */
/* Subcomponents following Component Structure                               */
/* -------------------------------------------------------------------------- */

export function PageHeader() {
  return (
    <header className="courses-page-header">
      <h2>รายวิชาของฉัน</h2>
      <p>รายวิชาที่รับผิดชอบ และตารางสอนประจำสัปดาห์</p>
    </header>
  );
}

export function SubjectDetailCard({
  course,
  schedule,
  onOpenCheckIn,
}: {
  course: TeacherCourse;
  schedule?: CourseSchedule;
  onOpenCheckIn: () => void;
}) {
  const periodLabel = schedule?.periodName
    ? schedule.periodName.includes("คาบ")
      ? schedule.periodName
      : `คาบที่ ${schedule.periodName}`
    : "คาบที่ 1";

  const roomDisplay = course.location
    ? course.location.includes("ห้อง")
      ? course.location
      : `ห้อง ${course.location}`
    : course.room
      ? course.room.includes("ห้อง")
        ? course.room
        : `ห้อง ${course.room}`
      : "ห้องเรียน";

  const dayDisplay = schedule?.day
    ? schedule.day.replace("วัน", "")
    : course.day
      ? course.day.replace("วัน", "")
      : "จันทร์";

  const timeDisplay = schedule
    ? `${schedule.startTime.slice(0, 5)} - ${schedule.endTime.slice(0, 5)}`
    : course.startTime && course.endTime
      ? `${course.startTime.slice(0, 5)} - ${course.endTime.slice(0, 5)}`
      : "08:30 - 10:30";

  const periodNumber = schedule?.periodName
    ? schedule.periodName.replace(/[^0-9]/g, "") || schedule.periodName
    : "1";

  const teachingMode =
    course.attendanceMode === "FIRST_PERIOD"
      ? "เช็คชื่อคาบแรก"
      : "จัดการเรียนรู้ปกติ";

  const levelRoomDisplay =
    course.room && course.gradeLevel && course.room.includes(course.gradeLevel)
      ? course.room
      : course.gradeLevel && course.room
        ? `${course.gradeLevel} / ${course.room}`
        : course.gradeLevel || course.room || "ยังไม่ระบุ";

  return (
    <section
      className="teacher-subject-detail"
      aria-labelledby="selected-subject-title"
    >
      {/* Left: Summary */}
      <div className="teacher-subject-summary">
        <span className="teacher-subject-icon" aria-hidden="true">
          <BookOpen size={28} />
        </span>
        <div className="min-w-0">
          <div className="teacher-subject-title-line">
            <h3 id="selected-subject-title">{course.name}</h3>
            <span className="teacher-subject-status">กำลังสอน</span>
          </div>
          <p className="teacher-subject-context">
            {levelRoomDisplay} · {periodLabel} · {roomDisplay}
          </p>
          <p className="teacher-subject-description">
            {course.description || "ศิลปะสร้างสรรค์และการออกแบบ"}
          </p>
        </div>
      </div>

      {/* Middle: 2-column Facts */}
      <div className="teacher-subject-facts" aria-label="รายละเอียดรายวิชา">
        <dl>
          <div>
            <dt>
              <Hash size={16} aria-hidden="true" />
              <span>รหัสวิชา</span>
            </dt>
            <dd>{course.code}</dd>
          </div>
          <div>
            <dt>
              <Boxes size={16} aria-hidden="true" />
              <span>กลุ่มสาระ</span>
            </dt>
            <dd>{course.name}</dd>
          </div>
          <div>
            <dt>
              <School size={16} aria-hidden="true" />
              <span>ระดับชั้น / ห้อง</span>
            </dt>
            <dd>{levelRoomDisplay}</dd>
          </div>
          <div>
            <dt>
              <DoorOpen size={16} aria-hidden="true" />
              <span>ห้องเรียน</span>
            </dt>
            <dd>{roomDisplay}</dd>
          </div>
        </dl>
        <dl>
          <div>
            <dt>
              <CalendarRange size={16} aria-hidden="true" />
              <span>วันเรียน</span>
            </dt>
            <dd>{dayDisplay}</dd>
          </div>
          <div>
            <dt>
              <Clock3 size={16} aria-hidden="true" />
              <span>เวลา</span>
            </dt>
            <dd>{timeDisplay}</dd>
          </div>
          <div>
            <dt>
              <Clock3 size={16} aria-hidden="true" />
              <span>คาบที่</span>
            </dt>
            <dd>{periodNumber}</dd>
          </div>
          <div>
            <dt>
              <ClipboardCheck size={16} aria-hidden="true" />
              <span>รูปแบบการสอน</span>
            </dt>
            <dd>{teachingMode}</dd>
          </div>
        </dl>
      </div>

      {/* Right: Actions */}
      <div className="teacher-subject-actions" aria-label="การทำงานกับรายวิชา">
        <button
          type="button"
          className="button primary"
          onClick={onOpenCheckIn}
          disabled={!schedule && !course.schedules.length}
        >
          <ClipboardCheck size={17} aria-hidden="true" />
          <span>เช็คชื่อ</span>
        </button>
        <Link
          className="button secondary"
          href={`/teacher/courses/${course.id}/students`}
        >
          <UsersRound size={17} aria-hidden="true" />
          <span>ดูรายชื่อนักเรียน</span>
        </Link>
        <Link
          className="button secondary"
          href={`/teacher/history?subjectId=${course.id}`}
        >
          <History size={17} aria-hidden="true" />
          <span>ดูประวัติการเข้าเรียน</span>
        </Link>
      </div>
    </section>
  );
}

export function WeeklyScheduleHeader({
  selectedSemester,
  onSemesterChange,
  academicYear,
  onOpenAddSchedule,
}: {
  selectedSemester: number;
  onSemesterChange: (semester: number) => void;
  academicYear?: string;
  onOpenAddSchedule?: () => void;
}) {
  return (
    <div className="teacher-schedule-section-head">
      <div className="flex items-center gap-3">
        <span className="teacher-schedule-header-icon" aria-hidden="true">
          <CalendarDays size={20} />
        </span>
        <div>
          <h3 id="weekly-schedule-title">ตารางสอนประจำสัปดาห์</h3>
          <p>ตารางเรียนและห้องเรียนที่รับผิดชอบ</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="teacher-semester-navigator" aria-label="เลือกภาคเรียน">
          <button
            type="button"
            className="teacher-week-button"
            aria-label="ภาคเรียนก่อนหน้า"
            onClick={() => onSemesterChange(selectedSemester === 2 ? 1 : 2)}
            title="สลับภาคเรียน"
          >
            <ChevronLeft size={19} />
          </button>
          <div className="teacher-semester-badge">
            <CalendarDays size={18} aria-hidden="true" />
            <select
              aria-label="เลือกภาคเรียน"
              value={selectedSemester}
              onChange={(e) => onSemesterChange(Number(e.target.value))}
              className="teacher-semester-select"
            >
              <option value={1}>
                เทอม 1{academicYear ? ` / ${academicYear}` : ""}
              </option>
              <option value={2}>
                เทอม 2{academicYear ? ` / ${academicYear}` : ""}
              </option>
            </select>
          </div>
          <button
            type="button"
            className="teacher-week-button"
            aria-label="ภาคเรียนถัดไป"
            onClick={() => onSemesterChange(selectedSemester === 1 ? 2 : 1)}
            title="สลับภาคเรียน"
          >
            <ChevronRight size={19} />
          </button>
        </div>
        {onOpenAddSchedule && (
          <button
            type="button"
            className="button primary teacher-schedule-add"
            onClick={onOpenAddSchedule}
          >
            <Plus size={17} aria-hidden="true" />
            <span>เพิ่มตารางสอน</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function ScheduleFilters({
  dayFilter,
  setDayFilter,
  roomFilter,
  setRoomFilter,
  courseFilter,
  setCourseFilter,
  query,
  setQuery,
  onReset,
  displayDays,
  initialCourses,
}: {
  dayFilter: string;
  setDayFilter: (v: string) => void;
  roomFilter: string;
  setRoomFilter: (v: string) => void;
  courseFilter: string;
  setCourseFilter: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
  onReset: () => void;
  displayDays: number[];
  initialCourses: TeacherCourse[];
}) {
  const rooms = useMemo(
    () => [...new Set(initialCourses.map((course) => course.room))].filter(Boolean),
    [initialCourses],
  );

  return (
    <div className="teacher-timetable-filters" aria-label="ตัวกรองตารางสอน">
      <select
        aria-label="กรองตามวันสอน"
        value={dayFilter}
        onChange={(e) => setDayFilter(e.target.value)}
      >
        <option value="all">ทุกวัน</option>
        {displayDays.map((day) => (
          <option key={day} value={day}>
            {weekDays[day]}
          </option>
        ))}
      </select>

      <select
        aria-label="กรองตามระดับชั้นหรือห้องเรียน"
        value={roomFilter}
        onChange={(e) => setRoomFilter(e.target.value)}
      >
        <option value="all">ทุกระดับชั้น</option>
        {rooms.map((room) => (
          <option key={room} value={room}>
            {room}
          </option>
        ))}
      </select>

      <select
        aria-label="กรองตามรายวิชา"
        value={courseFilter}
        onChange={(e) => setCourseFilter(e.target.value)}
      >
        <option value="all">ทุกรายวิชา</option>
        {initialCourses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.code} — {course.name}
          </option>
        ))}
      </select>

      <label className="teacher-timetable-search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">ค้นหารายวิชา หรือห้องเรียน...</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหารายวิชา หรือห้องเรียน..."
        />
      </label>

      <button
        type="button"
        className="teacher-filter-reset"
        onClick={onReset}
      >
        <RotateCcw size={16} aria-hidden="true" />
        <span>ล้างตัวกรอง</span>
      </button>
    </div>
  );
}

export function DayColumn({ day }: { day: number }) {
  const dayName = weekDays[day]?.replace("วัน", "") || `วันที่ ${day}`;
  return (
    <th scope="row">
      <span className={`teacher-timetable-day day-${day}`}>{dayName}</span>
    </th>
  );
}

export function TimeHeader({ slot }: { slot: string }) {
  if (slot === lunchTimeSlot) {
    return (
      <th scope="col" className="teacher-timetable-lunch-head">
        <Utensils size={15} aria-hidden="true" />
        <strong>พักเที่ยง</strong>
        <small>{slot}</small>
      </th>
    );
  }

  return (
    <th scope="col">
      <Clock3 size={16} aria-hidden="true" />
      <span>{slot}</span>
    </th>
  );
}

function LunchCell() {
  return (
    <td className="teacher-timetable-lunch-cell">
      <span>
        <Utensils size={15} aria-hidden="true" />
        <strong>พักเที่ยง</strong>
        <small>รับประทานอาหาร</small>
      </span>
    </td>
  );
}

export function ScheduleCell({
  schedules,
  isSelected,
  onSelect,
  hasActiveFilters,
  colSpan,
}: {
  schedules: TimetableScheduleItem[];
  isSelected: (schedule: TimetableScheduleItem) => boolean;
  onSelect: (schedule: TimetableScheduleItem) => void;
  hasActiveFilters: boolean;
  colSpan?: number;
}) {
  if (!schedules.length) {
    return (
      <td colSpan={colSpan}>
        <span
          className={`teacher-timetable-free${hasActiveFilters ? " is-filtered" : ""}`}
        >
          {hasActiveFilters ? "—" : "ว่าง"}
        </span>
      </td>
    );
  }

  return (
    <td colSpan={colSpan}>
      <div
        className={`teacher-timetable-course-stack${schedules.length > 1 ? " has-conflict" : ""}`}
      >
        {schedules.map((schedule) => {
        const active = isSelected(schedule);
        const periodText = schedule.periodName
          ? schedule.periodName.replace(/[^0-9]/g, "") || schedule.periodName
          : "1";
        const roomText = schedule.room
          ? schedule.room.includes("ห้อง")
            ? schedule.room
            : `ห้อง ${schedule.room}`
          : "";

        return (
          <button
            type="button"
            key={schedule.key}
            className="teacher-timetable-course"
            onClick={() => onSelect(schedule)}
            aria-pressed={active}
            title={`เลือก ${schedule.courseName} เพื่อดูรายละเอียด`}
          >
            <span className="teacher-timetable-course-icon" aria-hidden="true">
              <BookOpen size={18} />
            </span>
            <span className="teacher-timetable-course-copy">
              <strong>{schedule.courseName}</strong>
              <small>
                {schedule.gradeLevel} · {roomText}
              </small>
              <em>{periodText}</em>
            </span>
            <MoreVertical
              className="teacher-timetable-course-more"
              size={16}
              aria-hidden="true"
            />
          </button>
        );
        })}
      </div>
    </td>
  );
}

export function WeeklyTimetable({
  displayDays,
  timeSlots,
  visibleSchedules,
  selectedCourseId,
  selectedScheduleId,
  onSelectSchedule,
  hasActiveFilters,
}: {
  displayDays: number[];
  timeSlots: string[];
  visibleSchedules: TimetableScheduleItem[];
  selectedCourseId: number;
  selectedScheduleId: number;
  onSelectSchedule: (courseId: number, scheduleId: number) => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="teacher-timetable-scroll">
      <table className="teacher-timetable-grid">
        <thead>
          <tr>
            <th scope="col" className="teacher-timetable-origin">
              วัน / เวลา
            </th>
            {timeSlots.map((slot) => (
              <TimeHeader key={slot} slot={slot} />
            ))}
          </tr>
        </thead>
        <tbody>
          {displayDays.map((day) => {
            const schedulesByStart = new Map<number, TimetableScheduleItem[]>();
            const occupiedSlots = new Set<number>();

            visibleSchedules
              .filter((schedule) => schedule.dayOfWeek === day)
              .forEach((schedule) => {
                const placement = schedulePlacement(schedule);
                if (!placement) return;
                const atStart = schedulesByStart.get(placement.startIndex) ?? [];
                schedulesByStart.set(placement.startIndex, [...atStart, schedule]);
                for (
                  let index = placement.startIndex + 1;
                  index < placement.startIndex + placement.colSpan;
                  index += 1
                ) {
                  occupiedSlots.add(index);
                }
              });

            return (
              <tr key={day}>
                <DayColumn day={day} />
                {timeSlots.map((slot, index) => {
                  if (slot === lunchTimeSlot) return <LunchCell key={slot} />;
                  if (occupiedSlots.has(index)) return null;

                  const schedulesInSlot = schedulesByStart.get(index) ?? [];
                  const colSpan = schedulesInSlot.length
                    ? Math.max(
                        ...schedulesInSlot.map(
                          (schedule) => schedulePlacement(schedule)?.colSpan ?? 1,
                        ),
                      )
                    : 1;

                  return (
                    <ScheduleCell
                      key={slot}
                      schedules={schedulesInSlot}
                      colSpan={colSpan}
                      isSelected={(schedule) =>
                        schedule.courseId === selectedCourseId &&
                        schedule.id === selectedScheduleId
                      }
                      onSelect={(schedule) =>
                        onSelectSchedule(schedule.courseId, schedule.id)
                      }
                      hasActiveFilters={hasActiveFilters}
                    />
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main CoursesClient Component                                               */
/* -------------------------------------------------------------------------- */

export function CoursesClient({
  initialCourses,
}: {
  initialCourses: TeacherCourse[];
}) {
  const router = useRouter();
  const [selectedSemester, setSelectedSemester] = useState<number>(() => {
    const current = initialCourses[0]?.semester;
    return current === 2 ? 2 : 1;
  });

  const academicYear = initialCourses[0]?.academicYear || "2568";

  const semesterCourses = useMemo(() => {
    const filtered = initialCourses.filter(
      (course) => course.semester === selectedSemester,
    );
    return filtered.length > 0 ? filtered : initialCourses;
  }, [initialCourses, selectedSemester]);

  const firstSchedulableCourse =
    semesterCourses.find((course) => course.schedules.length > 0) ??
    semesterCourses[0] ??
    initialCourses[0];

  const [modal, setModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [selected, setSelected] = useState(firstSchedulableCourse?.id ?? 0);
  const [selectedSchedule, setSelectedSchedule] = useState(
    firstSchedulableCourse?.schedules[0]?.id ?? 0,
  );
  const [sessionDate, setSessionDate] = useState(
    nextScheduleDate(firstSchedulableCourse?.schedules[0]?.dayOfWeek),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduleMessage, setScheduleMessage] = useState("");
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [dayFilter, setDayFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [query, setQuery] = useState("");

  const current = useMemo(
    () => semesterCourses.find((course) => course.id === selected) ?? semesterCourses[0] ?? initialCourses[0],
    [semesterCourses, initialCourses, selected],
  );

  const currentSchedule = useMemo(
    () =>
      current?.schedules.find((schedule) => schedule.id === selectedSchedule) ??
      current?.schedules[0],
    [current, selectedSchedule],
  );

  const weeklySchedule = useMemo<TimetableScheduleItem[]>(
    () =>
      semesterCourses
        .flatMap((course) =>
          course.schedules.map((schedule, index) => ({
            ...schedule,
            key: `${course.id}-${schedule.id || `${schedule.dayOfWeek}-${index}`}`,
            courseCode: course.code,
            courseName: course.name,
            room: course.room,
            gradeLevel: course.gradeLevel,
            location: course.location,
            courseId: course.id,
          })),
        )
        .sort(
          (a, b) =>
            a.dayOfWeek - b.dayOfWeek ||
            a.startTime.localeCompare(b.startTime) ||
            a.courseCode.localeCompare(b.courseCode),
        ),
    [semesterCourses],
  );

  const displayDays = useMemo(
    () => [
      ...weekdays,
      ...[6, 7].filter((day) =>
        weeklySchedule.some((item) => item.dayOfWeek === day),
      ),
    ],
    [weeklySchedule],
  );

  const timeSlots = defaultTimeSlots;

  const visibleSchedules = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("th-TH");
    return weeklySchedule.filter((schedule) => {
      const matchesDay =
        dayFilter === "all" || schedule.dayOfWeek === Number(dayFilter);
      const matchesCourse =
        courseFilter === "all" || schedule.courseId === Number(courseFilter);
      const matchesRoom = roomFilter === "all" || schedule.room === roomFilter;
      const matchesSearch =
        !search ||
        `${schedule.courseName} ${schedule.courseCode} ${schedule.room} ${schedule.location}`
          .toLocaleLowerCase("th-TH")
          .includes(search);
      return matchesDay && matchesRoom && matchesCourse && matchesSearch;
    });
  }, [courseFilter, dayFilter, query, roomFilter, weeklySchedule]);

  const hasActiveFilters =
    dayFilter !== "all" ||
    roomFilter !== "all" ||
    courseFilter !== "all" ||
    query.trim().length > 0;

  function handleSemesterChange(semester: number) {
    setSelectedSemester(semester);
    const targetCourses = initialCourses.filter((c) => c.semester === semester);
    const pool = targetCourses.length > 0 ? targetCourses : initialCourses;
    const nextCourse = pool.find((c) => c.schedules.length > 0) ?? pool[0];
    if (nextCourse) {
      setSelected(nextCourse.id);
      const firstSched = nextCourse.schedules[0];
      setSelectedSchedule(firstSched?.id ?? 0);
      setSessionDate(nextScheduleDate(firstSched?.dayOfWeek));
    }
  }

  function openCheckIn(courseId: number, scheduleId?: number) {
    const course = initialCourses.find((item) => item.id === courseId);
    const schedule =
      course?.schedules.find((item) => item.id === scheduleId) ??
      course?.schedules[0];
    setSelected(courseId);
    setSelectedSchedule(schedule?.id ?? 0);
    setSessionDate(nextScheduleDate(schedule?.dayOfWeek));
    setMessage("");
    setModal(true);
  }

  function resetFilters() {
    setDayFilter("all");
    setRoomFilter("all");
    setCourseFilter("all");
    setQuery("");
  }

  function handleSelectSchedule(courseId: number, scheduleId: number) {
    const course = initialCourses.find((item) => item.id === courseId);
    const schedule =
      course?.schedules.find((item) => item.id === scheduleId) ??
      course?.schedules[0];
    setSelected(courseId);
    setSelectedSchedule(schedule?.id ?? 0);
    setSessionDate(nextScheduleDate(schedule?.dayOfWeek));
  }

  async function submitCheckInSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentSchedule) {
      setMessage(
        "รายวิชานี้ยังไม่มีตารางเรียน กรุณาเพิ่มคาบเรียนก่อนสร้างรอบเช็คชื่อ",
      );
      return;
    }
    setSaving(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/teacher/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selected,
          scheduleId: currentSchedule.id,
          sessionDate: values.get("sessionDate"),
          lateMinutes: Number(values.get("lateMinutes")),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "สร้างรอบเช็คชื่อไม่สำเร็จ");
      router.push(`/teacher/scan/${data.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  async function submitSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setScheduleSaving(true);
    setScheduleMessage("");
    try {
      const selectedTimeSlot = String(values.get("timeSlot") || teachingTimeSlots[0]);
      const [startTime, endTime] = selectedTimeSlot.split("-");
      const response = await fetch("/api/teacher/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: Number(values.get("subjectId")),
          dayOfWeek: Number(values.get("dayOfWeek")),
          periodName: values.get("periodName"),
          startTime,
          endTime,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "ไม่สามารถเพิ่มตารางสอนได้");
      setScheduleModal(false);
      router.refresh();
    } catch (error) {
      setScheduleMessage(
        error instanceof Error ? error.message : "เกิดข้อผิดพลาด",
      );
    } finally {
      setScheduleSaving(false);
    }
  }

  return (
    <div className="courses-page">
      <PageHeader />

      {initialCourses.length ? (
        <>
          {current && (
            <SubjectDetailCard
              course={current}
              schedule={currentSchedule}
              onOpenCheckIn={() => openCheckIn(current.id, currentSchedule?.id)}
            />
          )}

          <section
            className="teacher-schedule-section"
            aria-labelledby="weekly-schedule-title"
          >
            <WeeklyScheduleHeader
              selectedSemester={selectedSemester}
              onSemesterChange={handleSemesterChange}
              academicYear={academicYear}
              onOpenAddSchedule={() => {
                setScheduleMessage("");
                setScheduleModal(true);
              }}
            />

            <div className="teacher-timetable" aria-label="ตารางสอนของฉัน">
              <ScheduleFilters
                dayFilter={dayFilter}
                setDayFilter={setDayFilter}
                roomFilter={roomFilter}
                setRoomFilter={setRoomFilter}
                courseFilter={courseFilter}
                setCourseFilter={setCourseFilter}
                query={query}
                setQuery={setQuery}
                onReset={resetFilters}
                displayDays={displayDays}
                initialCourses={semesterCourses}
              />

              {timeSlots.length ? (
                <WeeklyTimetable
                  displayDays={displayDays}
                  timeSlots={timeSlots}
                  visibleSchedules={visibleSchedules}
                  selectedCourseId={selected}
                  selectedScheduleId={selectedSchedule}
                  onSelectSchedule={handleSelectSchedule}
                  hasActiveFilters={hasActiveFilters}
                />
              ) : (
                <div className="teacher-schedule-empty">
                  <CalendarDays size={28} aria-hidden="true" />
                  <strong>ยังไม่มีตารางสอน</strong>
                  <p>ตารางจะแสดงเมื่อกำหนดวันและเวลาเรียนของรายวิชา</p>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section
          className="panel courses-empty-panel"
          aria-label="ยังไม่มีรายวิชา"
        >
          <EmptyState
            icon={BookOpen}
            title="ยังไม่มีรายวิชาที่รับผิดชอบ"
            description="ส่งคำขอเปิดรายวิชาและเลือกห้องเรียน จากนั้นรอผู้ดูแลระบบอนุมัติ"
          />
          <Link
            className="button primary courses-empty-action"
            href="/teacher/subject-requests"
          >
            <Plus size={17} aria-hidden="true" />
            <span>ขอเปิดรายวิชา</span>
          </Link>
        </section>
      )}

      {/* Modal: สร้างรอบเช็คชื่อ */}
      {modal && current && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitCheckInSession}>
            <div className="modal-head">
              <div>
                <h3>สร้างรอบเช็คชื่อ</h3>
                <p className="muted">เลือกรอบจากตารางเรียนที่กำหนด</p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setModal(false)}
                aria-label="ปิด"
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <div className="field full">
                <label>รายวิชา</label>
                <select
                  value={selected}
                  onChange={(event) => {
                    const id = Number(event.target.value);
                    const course = initialCourses.find(
                      (item) => item.id === id,
                    );
                    const schedule = course?.schedules[0];
                    setSelected(id);
                    setSelectedSchedule(schedule?.id ?? 0);
                    setSessionDate(nextScheduleDate(schedule?.dayOfWeek));
                  }}
                >
                  {initialCourses.map((course) => (
                    <option value={course.id} key={course.id}>
                      {course.code} — {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>วันที่</label>
                <input
                  name="sessionDate"
                  type="date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>คาบเรียน</label>
                <select
                  value={currentSchedule?.id ?? ""}
                  onChange={(event) => {
                    const schedule = current.schedules.find(
                      (item) => item.id === Number(event.target.value),
                    );
                    setSelectedSchedule(schedule?.id ?? 0);
                    setSessionDate(nextScheduleDate(schedule?.dayOfWeek));
                  }}
                  required
                >
                  <option value="" disabled>
                    {current.schedules.length
                      ? "เลือกคาบเรียน"
                      : "ยังไม่มีตารางเรียน"}
                  </option>
                  {current.schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.day} · {schedule.periodName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>เวลาเริ่ม</label>
                <input
                  value={currentSchedule?.startTime.slice(0, 5) ?? "--:--"}
                  readOnly
                />
              </div>
              <div className="field">
                <label>เวลาสิ้นสุด</label>
                <input
                  value={currentSchedule?.endTime.slice(0, 5) ?? "--:--"}
                  readOnly
                />
              </div>
              <div className="field full">
                <label>ถือว่ามาสายหลังเริ่มเรียน (นาที)</label>
                <input
                  name="lateMinutes"
                  type="number"
                  defaultValue="15"
                  min="0"
                  max="120"
                  required
                />
              </div>
            </div>
            {message && <p className="form-message error">{message}</p>}
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setModal(false)}
                disabled={saving}
              >
                ยกเลิก
              </button>
              <button
                className="button primary"
                disabled={saving || !currentSchedule}
              >
                {saving && <LoaderCircle className="spin" size={16} />}{" "}
                {saving ? "กำลังสร้าง" : "สร้างรอบเช็คชื่อ"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: เพิ่มตารางสอน */}
      {scheduleModal && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitSchedule}>
            <div className="modal-head">
              <div>
                <h3>เพิ่มตารางสอน</h3>
                <p className="muted">
                  กำหนดวัน คาบ และเวลาเรียนของรายวิชาที่รับผิดชอบ
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setScheduleModal(false)}
                aria-label="ปิด"
                disabled={scheduleSaving}
              >
                <X />
              </button>
            </div>
            <div className="form-grid">
              <div className="field full">
                <label>รายวิชา</label>
                <select name="subjectId" defaultValue={selected} required>
                  {initialCourses.map((course) => (
                    <option value={course.id} key={course.id}>
                      {course.code} — {course.name} · {course.room}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>วันเรียน</label>
                <select
                  name="dayOfWeek"
                  defaultValue={currentSchedule?.dayOfWeek ?? 1}
                  required
                >
                  {weekdays.map((day) => (
                    <option value={day} key={day}>
                      {weekDays[day]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>ชื่อคาบเรียน</label>
                <input
                  name="periodName"
                  defaultValue="คาบเรียนที่ 1"
                  maxLength={50}
                />
              </div>
              <div className="field full">
                <label>ช่วงเวลาเรียน</label>
                <select
                  name="timeSlot"
                  defaultValue={
                    currentSchedule
                      ? scheduleTimeSlot(currentSchedule)
                      : teachingTimeSlots[0]
                  }
                  required
                >
                  {teachingTimeSlots.map((slot, index) => (
                    <option value={slot} key={slot}>
                      คาบ {index + 1} · {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {scheduleMessage && (
              <p className="form-message error">{scheduleMessage}</p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setScheduleModal(false)}
                disabled={scheduleSaving}
              >
                ยกเลิก
              </button>
              <button className="button primary" disabled={scheduleSaving}>
                {scheduleSaving && (
                  <LoaderCircle className="spin" size={16} />
                )}{" "}
                {scheduleSaving ? "กำลังบันทึก" : "บันทึกตารางสอน"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
