import { AttendanceManager } from "@/components/admin/attendance/AttendanceManager";
import { getAttendancePageData } from "@/lib/admin-data";
import "./attendance.css";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const data = await getAttendancePageData();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <main className="admin-content"><AttendanceManager initialData={data} today={today} /></main>;
}
