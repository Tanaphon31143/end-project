import StudentsManager from "@/components/admin/students/StudentsManager";
import { getStudentPageData } from "@/lib/admin-data";
import "./students.css";
export const dynamic = "force-dynamic";
export default async function StudentsPage() {
  const data = await getStudentPageData();
  return (
    <StudentsManager
        key={data.students.map((student) => student.databaseId).join("-")}
        initialStudents={data.students}
        classrooms={data.classrooms}
      />
  );
}
