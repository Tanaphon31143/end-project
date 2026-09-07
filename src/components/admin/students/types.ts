export type StudentStatus = "ACTIVE" | "INACTIVE";

export type StudentRecord = {
  databaseId: number;
  studentCode: string;
  fullName: string;
  email: string;
  classId: number | null;
  className: string;
  classLevel: string;
  classNumber: number | null;
  parentName: string;
  phone: string;
  status: StudentStatus;
};

export type ClassroomOption = { id: number; name: string; level: string };

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
