import { redirect } from "next/navigation";
import { ReportsClient } from "@/components/teacher/ReportsClient";
import { getTeacherSession } from "@/lib/auth";
import {
  getSchoolTerm,
  parseAcademicTerm,
  type AcademicTerm,
} from "@/lib/academic-term";
import { getTeacherCourses } from "@/lib/teacher-data";
import "./reports.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const queryValue = (value: string | string[] | undefined) =>
  typeof value === "string" && value ? value : undefined;

export default async function Reports({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getTeacherSession();
  if (!session) redirect("/");
  const [query, schoolTerm] = await Promise.all([searchParams, getSchoolTerm()]);
  let term: AcademicTerm;
  try {
    term = parseAcademicTerm(
      {
        academicYear: queryValue(query.academicYear),
        semester: queryValue(query.semester),
      },
      schoolTerm,
    );
  } catch {
    term = schoolTerm;
  }
  const courses = await getTeacherCourses(session.id, term, true);
  return (
    <ReportsClient
      courses={courses.map(({ id, code, name, semester }) => ({
        id,
        code,
        name,
        semester,
      }))}
      initialTerm={term}
    />
  );
}
