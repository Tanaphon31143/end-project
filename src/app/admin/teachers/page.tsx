import TeachersManager from "@/components/admin/teachers/TeachersManager";
import { getTeacherPageData } from "@/lib/admin-data";
import "./teachers.css";
export const dynamic = "force-dynamic";
export default async function TeachersPage() {
  const data=await getTeacherPageData();
  return <TeachersManager initialTeachers={data.teachers} initialSubjects={data.subjects}/>;
}
