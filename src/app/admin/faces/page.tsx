import {
  AdminTable,
  Badge,
  FilterBar,
  PageIntro,
  PersonCell,
} from "@/components/admin/AdminPage";
import { getFaces } from "@/lib/admin-data";
export const dynamic = "force-dynamic";
export default async function FacesPage() {
  const faceRecords = await getFaces();
  return (
    <main className="admin-content">
      <PageIntro
        title="ข้อมูลใบหน้า"
        description="รูปอ้างอิงสำหรับระบบตรวจจับใบหน้า"
        action="เพิ่มข้อมูลใบหน้า"
      />
      <FilterBar search="ค้นหารหัสหรือชื่อนักเรียน" filters={["สถานะข้อมูล"]} />
      <AdminTable
        title="ข้อมูลใบหน้าที่ลงทะเบียน"
        rows={faceRecords}
        columns={[
          { key: "id", label: "รหัสนักเรียน" },
          {
            key: "name",
            label: "รูปอ้างอิง / นักเรียน",
            render: (r) => (
              <PersonCell initials={r.name.slice(0, 2)} name={r.name} />
            ),
          },
          { key: "photos", label: "จำนวนรูป" },
          {
            key: "status",
            label: "สถานะ",
            render: (r) => (
              <Badge tone={r.status === "พร้อมใช้งาน" ? "green" : "orange"}>
                {r.status}
              </Badge>
            ),
          },
          { key: "date", label: "วันที่ลงทะเบียน" },
        ]}
        actions={["แก้ไข", "ลบ"]}
      />
    </main>
  );
}
