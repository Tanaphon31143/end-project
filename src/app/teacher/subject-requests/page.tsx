import { getTeacherSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getSchoolTerm,
  parseAcademicTerm,
} from "@/lib/academic-term";
import { getTeacherSubjectRequests } from "@/lib/subject-requests";
import { SubjectRequestsClient } from "@/components/teacher/SubjectRequestsClient";
import "./requests.css";

export const dynamic = "force-dynamic";
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const queryValue = (value: string | string[] | undefined) =>
  typeof value === "string" && value ? value : undefined;

export default async function SubjectRequestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getTeacherSession();
  if (!session) return null;
  const [requests, classrooms, query, schoolTerm] = await Promise.all([
    getTeacherSubjectRequests(session.id),
    prisma.classroom.findMany({
      select: { id: true, name: true, level: true },
      orderBy: { name: "asc" },
    }),
    searchParams,
    getSchoolTerm(),
  ]);
  let term = schoolTerm;
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
  return (
    <SubjectRequestsClient
      initialRequests={requests}
      classrooms={classrooms}
      academicYear={term.academicYear}
      semester={term.semester}
    />
  );
}
