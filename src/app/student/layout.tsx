import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth";
import StudentShell from "@/components/student/StudentShell";
import { StudentToastProvider } from "@/components/student/StudentToast";
import { getStudentIdentity } from "@/lib/student-data";
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
  const identity = await getStudentIdentity(session.id);
  if (!identity) redirect("/");
  // The student APIs refuse this session too (passwordChangeRequired in @/lib/auth).
  if (session.mustChangePassword) return <ForcedPasswordChange name={identity.name} />;

  return (
    <StudentToastProvider>
      <StudentShell identity={identity}>{children}</StudentShell>
    </StudentToastProvider>
  );
}
