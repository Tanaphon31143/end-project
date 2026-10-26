import { CoursesClient } from "@/components/teacher/CoursesClient";
import { getTeacherSession } from "@/lib/auth";
import { getSchoolTerm, parseAcademicTerm } from "@/lib/academic-term";
import { getTeacherCourses } from "@/lib/teacher-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const queryValue = (value: string | string[] | undefined) =>
  typeof value === "string" && value ? value : undefined;

export default async function Courses({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getTeacherSession();
  if (!session) return null;
  const [query, schoolTerm] = await Promise.all([searchParams, getSchoolTerm()]);
  let selectedTerm = schoolTerm;
  try {
    selectedTerm = parseAcademicTerm(
      {
        academicYear: queryValue(query.academicYear),
        semester: queryValue(query.semester),
      },
      schoolTerm,
    );
  } catch {
    // Invalid query parameters should not prevent a teacher from opening the page.
  }
  const courses = await getTeacherCourses(session.id, selectedTerm, true);
  return (
    <CoursesClient
      key={`${selectedTerm.academicYear}-${selectedTerm.semester}`}
      initialCourses={courses}
      initialTerm={selectedTerm}
    />
  );
}
