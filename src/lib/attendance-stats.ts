export const ATTENDANCE_THRESHOLD = 0.8;

export type AttendanceStatus = "PRESENT" | "LATE" | "LEAVE" | "ABSENT";

export type AttendanceDayRecord = {
  date: string;
  status: AttendanceStatus;
  subjectName: string;
  subjectCode: string;
  classTime: string;
  note?: string;
};

export type AttendanceCounts = Record<Lowercase<AttendanceStatus>, number> & {
  total: number;
};

export const STATUS_ORDER: AttendanceStatus[] = ["PRESENT", "LATE", "LEAVE", "ABSENT"];

export const STATUS_STYLE: Record<AttendanceStatus, {
  label: string;
  shortLabel: string;
  color: string;
  softColor: string;
  textColor: string;
}> = {
  PRESENT: { label: "มาเรียน", shortLabel: "มา", color: "#087c4a", softColor: "#e7f7ee", textColor: "#087c4a" },
  LATE: { label: "มาสาย", shortLabel: "สาย", color: "#b54708", softColor: "#fff4df", textColor: "#9a4d0a" },
  LEAVE: { label: "ลา", shortLabel: "ลา", color: "#6941c6", softColor: "#f1ebff", textColor: "#6941c6" },
  ABSENT: { label: "ขาดเรียน", shortLabel: "ขาด", color: "#d92d20", softColor: "#ffebeb", textColor: "#b42318" },
};

export function summarizeStatuses(records: Array<Pick<AttendanceDayRecord, "status">>): AttendanceCounts {
  const counts: AttendanceCounts = { present: 0, late: 0, leave: 0, absent: 0, total: 0 };
  for (const record of records) {
    const key = record.status.toLowerCase() as Lowercase<AttendanceStatus>;
    if (key in counts) counts[key] += 1;
    counts.total += 1;
  }
  return counts;
}

/** โรงเรียนถือว่า มา + สาย เป็นการเข้าเรียน ส่วนลาไม่ถูกนับเป็นการเข้าเรียน */
export function attendanceRate(counts: AttendanceCounts): number | null {
  if (!counts.total) return null;
  return Math.round(((counts.present + counts.late) / counts.total) * 100);
}

export function dominantStatus(records: Array<Pick<AttendanceDayRecord, "status">>): AttendanceStatus | null {
  if (!records.length) return null;
  return STATUS_ORDER.reduce<AttendanceStatus | null>((current, status) => {
    const count = records.filter((record) => record.status === status).length;
    const currentCount = current ? records.filter((record) => record.status === current).length : -1;
    return count > currentCount ? status : current;
  }, null);
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<number | null> = Array.from({ length: first.getUTCDay() }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
