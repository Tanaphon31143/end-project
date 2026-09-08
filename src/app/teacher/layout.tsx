import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherIdentity, getTeacherNotifications } from "@/lib/teacher-data";
import "./teacher.css";
export const metadata: Metadata = {
  title: "ระบบสำหรับครู | School OS",
  description: "ระบบเช็คชื่อด้วยการสแกนใบหน้าสำหรับครูผู้สอน",
};
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getTeacherSession();
  if (!session) redirect("/");
  const [identity, notifications] = await Promise.all([
    getTeacherIdentity(session.id),
    getTeacherNotifications(session.id).catch((error) => {
      console.error("Unable to load teacher notifications", error);
      return [];
    }),
  ]);
  if (!identity) redirect("/");
  return <TeacherShell identity={identity} notifications={notifications}>{children}</TeacherShell>;
}
