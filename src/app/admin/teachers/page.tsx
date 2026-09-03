import {
  AdminTable,
  FilterBar,
  PageIntro,
  PersonCell,
} from "@/components/admin/AdminPage";
import { getTeachers } from "@/lib/admin-data";
export const dynamic = "force-dynamic";
export default async function TeachersPage() {
  const teachers = await getTeachers();
  return (
    <main className="admin-content">
      <PageIntro
        title="ข้อมูลครู"
        description="ข้อมูลบุคลากรและภาระการสอน"
        action="เพิ่มครู"
      />
      <FilterBar search="ค้นหารหัสหรือชื่อครู" />
      <AdminTable
        title="รายชื่อครู"
        rows={teachers}
        columns={[
          { key: "id", label: "รหัสครู" },
          {
            key: "name",
            label: "ชื่อ-สกุล",
            render: (r) => (
              <PersonCell initials={r.name.slice(0, 2)} name={r.name} />
            ),
          },
          { key: "department", label: "กลุ่มสาระ" },
          { key: "subjects", label: "รายวิชาที่รับผิดชอบ" },
          { key: "phone", label: "เบอร์โทร" },
        ]}
      />
    </main>
  );
}
