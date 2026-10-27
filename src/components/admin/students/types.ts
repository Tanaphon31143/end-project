export type StudentStatus = "ACTIVE" | "INACTIVE";

export type StudentRecord = {
  databaseId: number;
  hasProfileImage?: number | boolean;
  isLoggedIn: boolean | number;
  studentCode: string;
  fullName: string;
  email: string;
  classId: number | null;
  className: string;
  classLevel: string;
  classNumber: number | null;
  academicYear: string;
  semester: "1" | "2";
  termHistory: StudentTermMembership[];
  parentName: string;
  phone: string;
  status: StudentStatus;
};

export type StudentTermMembership = {
  classroomId: number;
  className: string;
  classNumber: number | null;
  academicYear: string;
  semester: "1" | "2";
};

export type StudentAccountOption = Pick<
  StudentRecord,
  "databaseId" | "studentCode" | "fullName" | "email" | "status" | "termHistory"
>;

export type ClassroomOption = {
  id: number;
  name: string;
  level: string;
  advisorName?: string;
  academicYear: string;
  semester: "1" | "2";
};

export type StudentFormValue = {
  studentCode: string;
  fullName: string;
  email: string;
  password: string;
  classId: number | null;
  classNumber: string;
  parentName: string;
  phone: string;
  status: StudentStatus;
};

export const EMPTY_STUDENT: StudentFormValue = {
  studentCode: "",
  fullName: "",
  email: "",
  password: "",
  classId: null,
  classNumber: "",
  parentName: "",
  phone: "",
  status: "ACTIVE",
};
