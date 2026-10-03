import SubjectsManager from "@/components/admin/subjects/SubjectsManager";
import { getSubjectPageData } from "@/lib/admin-data";
import { getAdminSubjectRequests } from "@/lib/subject-requests";
import "./requests.css";
export const dynamic = "force-dynamic";
export default async function SubjectsPage() {
  const [data, requests] = await Promise.all([getSubjectPageData(), getAdminSubjectRequests()]);
  return (
    <SubjectsManager
      initialSubjects={data.subjects}
      initialRequests={requests}
      teachers={data.teachers}
      classrooms={data.classrooms}
      academicYear={data.academicYear}
    />
  );
}
