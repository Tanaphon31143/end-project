import {
  AdminTable,
  Badge,
  FilterBar,
  PageIntro,
  PersonCell,
} from "@/components/admin/AdminPage";
import { getUsers } from "@/lib/admin-data";
export const dynamic = "force-dynamic";
export default async function UsersPage() {
  const users = await getUsers();
  return (
    <main className="admin-content">
      <PageIntro
        title="บัญชีผู้ใช้งาน"
        description="จัดการบัญชีและสิทธิ์การเข้าถึงระบบ"
        action="เพิ่มผู้ใช้งาน"
      />
      <FilterBar
        search="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้"
        filters={["บทบาทผู้ใช้งาน"]}
      />
      <AdminTable
        title="รายชื่อผู้ใช้งาน"
        rows={users}
        actions={["ดู", "แก้ไข", "เปลี่ยนรหัสผ่าน", "ลบ"]}
        columns={[
          { key: "id", label: "รหัส" },
          {
            key: "name",
            label: "ชื่อผู้ใช้งาน",
            render: (r) => (
              <PersonCell
                initials={r.name.slice(0, 2)}
                name={r.name}
                detail={r.email}
              />
            ),
          },
          {
            key: "role",
            label: "บทบาท",
            render: (r) => (
              <Badge
                tone={
                  r.role === "Admin"
                    ? "purple"
                    : r.role === "Teacher"
                      ? "blue"
                      : "gray"
                }
              >
                {r.role}
              </Badge>
            ),
          },
          {
            key: "status",
            label: "สถานะ",
            render: (r) => (
              <Badge tone={r.status === "ACTIVE" ? "green" : "red"}>
                {r.status === "ACTIVE" ? "ใช้งาน" : "ระงับ"}
              </Badge>
            ),
          },
        ]}
      />
    </main>
  );
}
