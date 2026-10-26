import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth";
import StudentShell from "@/components/student/StudentShell";
import { StudentToastProvider } from "@/components/student/StudentToast";
import { getStudentIdentity } from "@/lib/student-data";
import { studentMustChangePassword } from "@/lib/student-password-policy";
import ForcedPasswordChange from "@/components/student/ForcedPasswordChange";
import "./student.css";
import "../profile.css";
import "../portal-ui.css";
import "../responsive.css";

export const metadata: Metadata = {
  title: "ระบบสำหรับนักเรียน | School OS",
};

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const [identity, mustChangePassword] = await Promise.all([
    getStudentIdentity(session.id),
    studentMustChangePassword(session.id),
  ]);
  if (!identity) redirect("/");
  if (mustChangePassword) return <ForcedPasswordChange name={identity.name} />;

  return (
    <StudentToastProvider>
      <StudentShell identity={identity}>{children}</StudentShell>
    </StudentToastProvider>
  );
}
