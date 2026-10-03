import { notFound } from "next/navigation";
import ClassroomDetail from "@/components/admin/classes/ClassroomDetail";
import { getClassroomPageData } from "@/lib/admin-data";
import "../classes.css";

export const dynamic = "force-dynamic";

export default async function ClassroomDetailPage({ params }: PageProps<"/admin/classes/[id]">) {
  const { id } = await params;
  const classroomId = Number(id);
  if (!Number.isInteger(classroomId)) notFound();
  const data = await getClassroomPageData();
  const classroom = data.classrooms.find((item) => item.id === classroomId);
  if (!classroom) notFound();
  return <ClassroomDetail classroom={classroom} initialStudents={data.studentsByClass[classroomId] || []} />;
}
