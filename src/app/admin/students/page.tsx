import StudentsManager from "@/components/admin/students/StudentsManager";
import StudentAddDropdown from "@/components/admin/students/StudentAddDropdown";
import { getStudentPageData } from "@/lib/admin-data";
import "./students.css";
import "./students-position.css";
export const dynamic = "force-dynamic";
export default async function StudentsPage() {
  const data=await getStudentPageData();
  return <><StudentAddDropdown classrooms={data.classrooms}/><StudentsManager key={data.students.map(student=>student.databaseId).join("-")} initialStudents={data.students} classrooms={data.classrooms}/></>;
}
