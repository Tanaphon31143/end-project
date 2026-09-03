import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth";
import StudentShell from "@/components/student/StudentShell";
import "./student.css";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  if (!(await getStudentSession())) redirect("/");

  return <StudentShell>{children}</StudentShell>;
}
