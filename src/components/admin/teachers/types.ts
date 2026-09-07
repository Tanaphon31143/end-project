export type TeacherStatus = "ACTIVE" | "INACTIVE";

export type TeacherRecord = {
  databaseId: number;
  teacherCode: string;
  fullName: string;
  email: string;
  department: string;
  phone: string;
  status: TeacherStatus;
  subjectIds: number[];
  subjectNames: string[];
  advisorRooms: string[];
};

export type TeacherSubjectOption = {
  id: number;
  code: string;
  name: string;
  teacherId: number | null;
  teacherName: string;
};

export type TeacherFormValue = {
  teacherCode: string;
  fullName: string;
  email: string;
  password: string;
  department: string;
  phone: string;
  status: TeacherStatus;
  subjectIds: number[];
};

export const EMPTY_TEACHER: TeacherFormValue = {
  teacherCode: "",
  fullName: "",
  email: "",
  password: "",
  department: "",
  phone: "",
  status: "ACTIVE",
  subjectIds: [],
};
