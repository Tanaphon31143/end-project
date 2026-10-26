export type UserRole = "admin" | "teacher" | "student";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type AdminUserRecord = {
  id: string;
  hasProfileImage?: number | boolean;
  isLoggedIn: boolean | number;
  databaseId: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  code: string;
  classId?: number | null;
  className?: string;
  classLevel?: string;
  createdAt?: string;
};

export type UserFormValue = {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  code: string;
  password: string;
};

export const EMPTY_USER: UserFormValue = {
  name: "",
  email: "",
  role: "student",
  status: "ACTIVE",
  code: "",
  password: "",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};
