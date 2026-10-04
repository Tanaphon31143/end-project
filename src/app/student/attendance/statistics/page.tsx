import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ChartNoAxesColumnIncreasing } from "lucide-react";
import "./statistics.css";
import AttendanceFilters from "@/components/student/AttendanceFilters";
import AttendanceOverview from "@/components/student/AttendanceOverview";
import { getStudentSession } from "@/lib/auth";
import { getStudentStatistics } from "@/lib/student-data";
import type { AttendanceStatus } from "@/lib/attendance-stats";

export const dynamic = "force-dynamic";

type StatisticsSearchParams = Promise<{
  term?: string;
  semester?: string;
  academicYear?: string;
  subject?: string;
  from?: string;
  to?: string;
  status?: string;
}>;

export default async function Statistics({ searchParams }: { searchParams: StatisticsSearchParams }) {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const query = await searchParams;
  const [termSemester, termAcademicYear] = (query.term || "").split("|");
  const data = await getStudentStatistics(session.id, {
    semester: Number(termSemester || query.semester) || undefined,
    academicYear: termAcademicYear || query.academicYear,
    subjectId: Number(query.subject) || undefined,
    from: query.from,
    to: query.to,
  });
  if (!data) redirect("/");
  const selectedTerm = data.filters.semester && data.filters.academicYear ? `${data.filters.semester}|${data.filters.academicYear}` : "";
  const statusMap: Record<string, AttendanceStatus> = { present: "PRESENT", late: "LATE", leave: "LEAVE", absent: "ABSENT" };
  const selectedStatus = query.status ? statusMap[query.status] : undefined;

  return (
    <div className="attendance-statistics">
      <nav className="statistics-breadcrumb" aria-label="เส้นทางนำทาง">
        <Link href="/student/dashboard">หน้าหลัก</Link><ChevronRight aria-hidden="true" /><span aria-current="page">สถิติการเข้าเรียน</span>
      </nav>
      <div className="statistics-page-head">
        <header className="statistics-heading"><ChartNoAxesColumnIncreasing className="statistics-title-icon" aria-hidden="true" /><div><h1>สถิติการเข้าเรียน</h1><p>ติดตามภาพรวมและแนวโน้มการเข้าเรียนของคุณ</p></div></header>
        <AttendanceFilters selectedTerm={selectedTerm} selectedSubject={data.filters.subjectId} from={data.filters.from} to={data.filters.to} terms={data.options.terms} subjects={data.options.subjects} status={query.status} />
      </div>
      <AttendanceOverview summary={data.summary} subjects={data.subjects} attendanceDays={data.attendanceDays} selectedSubject={data.filters.subjectId} initialStatus={selectedStatus} />
    </div>
  );
}
