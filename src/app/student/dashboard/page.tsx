import { notFound, redirect } from "next/navigation";
import StudentDashboardView from "@/components/student/dashboard/StudentDashboardView";
import { getStudentSession } from "@/lib/auth";
import { getStudentDashboardData, getStudentStatistics } from "@/lib/student-data";
import { getStudentNotifications } from "@/lib/notifications";
import { getAnnouncements } from "@/lib/announcements";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const [data, notificationResult, statsDetail, announcements] = await Promise.all([
    getStudentDashboardData(session.id),
    getStudentNotifications(session.id, 2),
    getStudentStatistics(session.id),
    getAnnouncements(),
  ]);
  if (!data || !statsDetail) notFound();
  return <StudentDashboardView dashboard={data} notifications={notificationResult.notifications} statsDetail={statsDetail} announcements={announcements} />;
}
