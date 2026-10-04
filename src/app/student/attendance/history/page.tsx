import { redirect } from "next/navigation";
import AttendanceHistoryView from "@/components/student/AttendanceHistoryView";
import { getStudentSession } from "@/lib/auth";
import { getStudentAttendance, getStudentCourses } from "@/lib/student-data";
import "./history-filters.css";

export const dynamic = "force-dynamic";

export default async function History({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; subject?: string; status?: string }>;
}) {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const query = await searchParams;
  const subjectId = Number(query.subject) || undefined;
  const invalidRange = Boolean(query.from && query.to && query.from > query.to);
  const baseFilters = invalidRange ? {} : { from: query.from, to: query.to, subjectId };
  const [allRecords, scopedRecords, records, courses] = await Promise.all([
    getStudentAttendance(session.id),
    invalidRange ? Promise.resolve([]) : getStudentAttendance(session.id, baseFilters),
    invalidRange
      ? Promise.resolve([])
      : getStudentAttendance(session.id, { ...baseFilters, status: query.status }),
    getStudentCourses(session.id),
  ]);

  const counts = scopedRecords.reduce(
    (result, record) => {
      if (record.status === "มาเรียน") result.present += 1;
      if (record.status === "สาย") result.late += 1;
      if (record.status === "ขาด") result.absent += 1;
      if (record.status === "ลา") result.leave += 1;
      return result;
    },
    { present: 0, late: 0, absent: 0, leave: 0 },
  );

  return (
    <AttendanceHistoryView
      records={records}
      courses={courses.map((course) => ({ id: course.id, name: course.name }))}
      counts={counts}
      totalScoped={scopedRecords.length}
      totalAll={allRecords.length}
      from={query.from}
      to={query.to}
      subject={query.subject}
      status={query.status}
      invalidRange={invalidRange}
    />
  );
}
