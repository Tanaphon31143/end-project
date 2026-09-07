export type Classroom = {
  id: number;
  name: string;
  level: string;
  roomNumber: string;
  advisorTeacherId: number | null;
  advisorName: string;
  academicYear: string;
  semester: "1" | "2";
  isActive: boolean;
  note: string;
  studentCount: number;
};
export type ClassStudent = {
  id: number;
  number: number;
  code: string;
  name: string;
  gender: "ชาย" | "หญิง" | "ไม่ระบุ";
  status: string;
  faceRegistered: boolean;
};
export type TeacherOption = { id: number; name: string };
export type ClassroomValue = {
  className: string;
  gradeLevel: string;
  roomNumber: string;
  advisorTeacherId: number | null;
  academicYear: string;
  semester: "1" | "2";
  isActive: boolean;
  note: string;
};
