import StudentsManager from "@/components/admin/students/StudentsManager";
import { getStudentPageData } from "@/lib/admin-data";
import { getSchoolTerm, parseAcademicTerm } from "@/lib/academic-term";
import "./students.css";
export const dynamic = "force-dynamic";
export default async function StudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const term = parseAcademicTerm(await searchParams, await getSchoolTerm());
  const data = await getStudentPageData(term);
  return (
    <StudentsManager
        key={`${data.academicYear}-${data.semester}-${data.students.map((student) => student.databaseId).join("-")}`}
        initialStudents={data.students}
        initialAvailableStudents={data.availableStudents}
        classrooms={data.classrooms}
        latestAccess={data.latestAccess}
        academicYear={data.academicYear}
        semester={data.semester}
        academicYears={data.academicYears}
      />
  );
}
