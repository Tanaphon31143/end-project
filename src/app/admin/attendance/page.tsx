import { AttendanceManager } from "@/components/admin/attendance/AttendanceManager";
import { getAttendancePageData } from "@/lib/admin-data";
import "./attendance.css";
import { AttendanceIssues } from "@/components/portal/AttendanceIssues";
import { getAttendanceIssues } from "@/lib/attendance-issues";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const [data, issues] = await Promise.all([getAttendancePageData(), getAttendanceIssues()]);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return <main className="admin-content"><AttendanceManager initialData={data} today={today} /><AttendanceIssues initial={issues} /></main>;
}
