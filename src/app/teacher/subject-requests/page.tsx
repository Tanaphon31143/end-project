import { getTeacherSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTeacherSubjectRequests } from "@/lib/subject-requests";
import { SubjectRequestsClient } from "@/components/teacher/SubjectRequestsClient";
import "./requests.css";

export const dynamic = "force-dynamic";
export default async function SubjectRequestsPage() {
  const session = await getTeacherSession();
  if (!session) return null;
  const [requests, classrooms] = await Promise.all([
    getTeacherSubjectRequests(session.id),
    prisma.classroom.findMany({
      select: { id: true, name: true, level: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const academicYear = String(new Date().getFullYear() + 543);
  return (
    <SubjectRequestsClient
      initialRequests={requests}
      classrooms={classrooms}
      academicYear={academicYear}
    />
  );
}
