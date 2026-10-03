import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth";
import StudentShell from "@/components/student/StudentShell";
import { StudentToastProvider } from "@/components/student/StudentToast";
import { getStudentIdentity } from "@/lib/student-data";
import "./student.css";
import "../portal-ui.css";
import "../responsive.css";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const identity = await getStudentIdentity(session.id);
  if (!identity) redirect("/");

  return (
    <StudentToastProvider>
      <StudentShell identity={identity}>{children}</StudentShell>
    </StudentToastProvider>
  );
}
