import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/auth";
import { getStudentCourses } from "@/lib/student-data";
import StudentCoursesView from "@/components/student/courses/StudentCoursesView";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const session = await getStudentSession();
  if (!session) redirect("/");

  // Fetch courses strictly for the authenticated student
  const courses = await getStudentCourses(session.id);

  return <StudentCoursesView courses={courses} />;
}
