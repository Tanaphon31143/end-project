import {
  AdminTable,
  Badge,
  FilterBar,
  PageIntro,
  PersonCell,
} from "@/components/admin/AdminPage";
import { getAttendance } from "@/lib/admin-data";
export const dynamic = "force-dynamic";
export default async function AttendancePage() {
  const attendance = await getAttendance();
  const count = (status: string) =>
    attendance.filter((row) => row.status === status).length;
  return (
    <main className="admin-content">
      <PageIntro
        title="ประวัติการเข้าเรียน"
        description="ข้อมูลการเข้าเรียนจากฐานข้อมูล"
        action="บันทึกข้อมูล"
      />
      <FilterBar
        search="ค้นหาชื่อนักเรียน"
        filters={["วันที่", "รายวิชา", "สถานะ"]}
      />
      <div className="mini-summary">
        <span>
          <b>{count("มาเรียน")}</b>มาเรียน
        </span>
        <span>
          <b>{count("สาย")}</b>มาสาย
        </span>
        <span>
          <b>{count("ขาด")}</b>ขาดเรียน
        </span>
        <span>
          <b>{count("ลา")}</b>ลา
        </span>
      </div>
      <AdminTable
        title="รายการเข้าเรียน"
        rows={attendance}
        columns={[
          { key: "date", label: "วันที่" },
          {
            key: "student",
            label: "นักเรียน",
            render: (r) => (
              <PersonCell initials={r.student.slice(0, 2)} name={r.student} />
            ),
          },
          { key: "subject", label: "รายวิชา" },
          { key: "time", label: "เวลา" },
          {
            key: "status",
            label: "สถานะ",
            render: (r) => (
              <Badge
                tone={
                  r.status === "มาเรียน"
                    ? "green"
                    : r.status === "สาย"
                      ? "orange"
                      : r.status === "ขาด"
                        ? "red"
                        : "blue"
                }
              >
                {r.status}
              </Badge>
            ),
          },
        ]}
        actions={["ดู", "แก้ไข"]}
      />
    </main>
  );
}
