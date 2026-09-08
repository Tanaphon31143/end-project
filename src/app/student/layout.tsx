import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth";
import StudentShell from "@/components/student/StudentShell";
import { getStudentIdentity } from "@/lib/student-data";
import "./student.css";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session=await getStudentSession();
  if (!session) redirect("/");
  const identity=await getStudentIdentity(session.id);
  if(!identity) redirect("/");

  return <StudentShell identity={identity}>{children}</StudentShell>;
}
