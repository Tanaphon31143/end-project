import {
  AdminTable,
  FilterBar,
  PageIntro,
  PersonCell,
} from "@/components/admin/AdminPage";
import { getStudents } from "@/lib/admin-data";
export const dynamic = "force-dynamic";
export default async function StudentsPage() {
  const students = await getStudents();
  return (
    <main className="admin-content">
      <PageIntro
        title="ทะเบียนนักเรียน"
        description="ข้อมูลนักเรียนประจำปีการศึกษา 2569"
        action="เพิ่มนักเรียน"
      />
      <FilterBar
        search="ค้นหารหัสหรือชื่อนักเรียน"
        filters={["ระดับชั้น", "ห้องเรียน"]}
      />
      <AdminTable
        title="รายชื่อนักเรียน"
        rows={students}
        columns={[
          { key: "id", label: "รหัสนักเรียน" },
          {
            key: "name",
            label: "ชื่อ-สกุล",
            render: (r) => (
              <PersonCell
                initials={r.name
                  .replace("เด็กชาย", "")
                  .replace("เด็กหญิง", "")
                  .slice(0, 2)}
                name={r.name}
              />
            ),
          },
          { key: "room", label: "ชั้น" },
          { key: "number", label: "เลขที่" },
          { key: "parent", label: "ผู้ปกครอง" },
          { key: "phone", label: "เบอร์โทร" },
        ]}
      />
    </main>
  );
}
