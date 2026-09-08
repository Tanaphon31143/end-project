import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/teacher/ReportsClient";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherCourses } from "@/lib/teacher-data";

export default async function Reports() {
  const session = await getTeacherSession();
  if (!session) redirect("/");
  const courses = await getTeacherCourses(session.id);
  return <ReportsClient courses={courses.map(({ id, code, name }) => ({ id, code, name }))} />;
}
