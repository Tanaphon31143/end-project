export type CheckInClassroom = { id: number; name: string; level: string };
export type CheckInSubject = {
  id: number;
  code: string;
  name: string;
  classroomId: number;
  className: string;
  startTime: string;
  endTime: string;
};
export type CheckInSession = {
  id: number;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  classroomId: number;
  className: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  lateAfter: string;
  status: "ACTIVE" | "CLOSED";
  checkedInCount: number;
};
export type CheckInRecord = {
  id: number;
  studentId: number;
  studentCode: string;
  studentName: string;
  className: string;
  checkInTime: string;
  status: "มาเรียน" | "สาย";
  confidence: number;
};
