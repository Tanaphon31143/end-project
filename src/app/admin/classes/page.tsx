import ClassesManager from "@/components/admin/classes/ClassesManager";
import { getClassroomPageData } from "@/lib/admin-data";
import "./classes.css";
export const dynamic = "force-dynamic";
export default async function ClassesPage() {
  const data=await getClassroomPageData();
  return <ClassesManager initialClasses={data.classrooms} initialStudents={data.studentsByClass} teachers={data.teachers} academicYear={data.academicYear} semester={data.semester}/>;
}
