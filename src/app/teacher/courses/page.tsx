import { CoursesClient } from "@/components/teacher/CoursesClient";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherCourses } from "@/lib/teacher-data";
export default async function Courses() {
  const session = await getTeacherSession();
  if (!session) return null;
  return <CoursesClient initialCourses={await getTeacherCourses(session.id)} />;
}
