import SubjectsManager from "@/components/admin/subjects/SubjectsManager";
import { getSubjectPageData } from "@/lib/admin-data";
export const dynamic = "force-dynamic";
export default async function SubjectsPage() {
  const data = await getSubjectPageData();
  return (
    <SubjectsManager
      initialSubjects={data.subjects}
      teachers={data.teachers}
      classrooms={data.classrooms}
      academicYear={data.academicYear}
    />
  );
}
