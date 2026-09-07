export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "LEAVE";

export type AttendanceRecord = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  classroomId: number | null;
  className: string;
  subjectId: number | null;
  subjectCode: string;
  subjectName: string;
  attendanceDate: string;
  checkInTime: string | null;
  status: AttendanceStatus;
  confidence: number | null;
  createdAt: string;
};

export type AttendanceAudit = {
  id: number;
  action: "ADD" | "STATUS_UPDATE";
  adminName: string;
  oldStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus;
  note: string;
  createdAt: string;
};

export type AttendanceOption = { id: number; code: string; name: string; classroomId: number | null };
export type ClassroomOption = { id: number; name: string };
export type StudentOption = { id: number; code: string; name: string; classroomId: number | null; className: string };

export type AttendancePageData = {
  records: AttendanceRecord[];
  students: StudentOption[];
  subjects: AttendanceOption[];
  classrooms: ClassroomOption[];
};
