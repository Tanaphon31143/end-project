export type SubjectRecord = {
  databaseId: number;
  subjectCode: string;
  subjectName: string;
  teacherId: number | null;
  teacherName: string;
  gradeLevel: string;
  classId: number | null;
  className: string;
  semester: "1" | "2";
  academicYear: string;
  credits: string;
  studyDays: string[];
  startTime: string;
  endTime: string;
  location: string;
  attendanceMode: "EVERY_PERIOD" | "FIRST_PERIOD";
  isActive: boolean;
  description: string;
  studentCount: number;
};

export type SubjectOption = { id: number; name: string };
export type ClassroomOption = SubjectOption & { level: string };

export type SubjectFormValue = Omit<SubjectRecord, "databaseId" | "teacherName" | "className" | "studentCount">;

export const EMPTY_SUBJECT: SubjectFormValue = {
  subjectCode: "", subjectName: "", teacherId: null, gradeLevel: "ม.5", classId: null,
  semester: "1", academicYear: "2569", credits: "1.0", studyDays: [], startTime: "08:30",
  endTime: "09:20", location: "", attendanceMode: "EVERY_PERIOD", isActive: true, description: "",
};
