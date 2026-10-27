import { notFound } from "next/navigation";
import ClassroomDetail from "@/components/admin/classes/ClassroomDetail";
import { getClassroomPageData } from "@/lib/admin-data";
import { getSchoolTerm, parseAcademicTerm } from "@/lib/academic-term";
import "../classes.css";

export const dynamic = "force-dynamic";

export default async function ClassroomDetailPage({ params, searchParams }: PageProps<"/admin/classes/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const classroomId = Number(id);
  if (!Number.isInteger(classroomId)) notFound();
  const term = parseAcademicTerm(query, await getSchoolTerm());
  const data = await getClassroomPageData(term);
  const classroom = data.classrooms.find((item) => item.id === classroomId);
  if (!classroom) notFound();
  return <ClassroomDetail classroom={classroom} initialStudents={data.studentsByClass[classroomId] || []} academicYear={term.academicYear} semester={String(term.semester) as "1" | "2"} />;
}
