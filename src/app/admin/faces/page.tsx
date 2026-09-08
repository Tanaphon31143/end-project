import FacesManager from "@/components/admin/faces/FacesManager";
import { getFacePageData } from "@/lib/admin-data";
import "./faces.css";
export const dynamic = "force-dynamic";
export default async function FacesPage() {
  const data = await getFacePageData();
  return (
    <FacesManager initialFaces={data.faces} initialStudents={data.students} />
  );
}
