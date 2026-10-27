import DateTimeInput from "@/components/forms/DateTimeInput";
import Link from "next/link";
import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { getTeacherSession } from "@/lib/auth";
import {
  getSchoolTerm,
  parseAcademicTerm,
  type AcademicTerm,
} from "@/lib/academic-term";
import { getTeacherCourses, getTeacherHistory } from "@/lib/teacher-data";
import { EmptyState } from "@/components/teacher/EmptyState";
import { AttendanceIssues } from "@/components/portal/AttendanceIssues";
import { getAttendanceIssues } from "@/lib/attendance-issues";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const value = (input: string | string[] | undefined) =>
  typeof input === "string" ? input : "";

export default async function History({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getTeacherSession();
  if (!session) redirect("/");
  const query = await searchParams;
  const schoolTerm = await getSchoolTerm();
  let term: AcademicTerm;
  try {
    term = parseAcademicTerm(
      {
        academicYear: value(query.academicYear) || undefined,
        semester: value(query.semester) || undefined,
      },
      schoolTerm,
    );
  } catch {
    term = schoolTerm;
  }
  const subjectId =
    Number(value(query.subjectId) || value(query.course)) || undefined;
  const filters = {
    subjectId,
    academicYear: term.academicYear,
    semester: term.semester,
    from: value(query.from),
    to: value(query.to),
    search: value(query.search),
    page: Number(value(query.page)) || 1,
  };
  const [courses, history, issues] = await Promise.all([
    getTeacherCourses(session.id, term),
    getTeacherHistory(session.id, filters),
    getAttendanceIssues(session.id),
  ]);
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    params.set("academicYear", term.academicYear);
    params.set("semester", String(term.semester));
    if (subjectId) params.set("subjectId", String(subjectId));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(page));
    return `/teacher/history?${params}`;
  };
  const detailHref = (sessionId: string) => {
    const params = new URLSearchParams({
      academicYear: term.academicYear,
      semester: String(term.semester),
    });
    if (subjectId) params.set("subjectId", String(subjectId));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(history.page));
    return `/teacher/history/${sessionId}?${params.toString()}`;
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>ประวัติการเข้าเรียน</h2>
          <p>
            ค้นหาและตรวจสอบผลการเช็คชื่อย้อนหลัง · ภาคเรียน {term.semester} / {term.academicYear}
          </p>
        </div>
      </div>
      <section className="panel">
        <form className="filters" method="get">
          <input type="hidden" name="academicYear" value={term.academicYear} />
          <select
            name="semester"
            defaultValue={term.semester}
            aria-label="ภาคเรียน"
          >
            <option value={1}>เทอม 1</option>
            <option value={2}>เทอม 2</option>
          </select>
          <select
            name="subjectId"
            defaultValue={subjectId ?? ""}
            aria-label="รายวิชา"
          >
            <option value="">ทุกรายวิชา</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} {course.name}
              </option>
            ))}
          </select>
          <DateTimeInput
            name="from"
            type="date"
            defaultValue={filters.from}
            aria-label="วันที่เริ่มต้น"
          />
          <DateTimeInput
            name="to"
            type="date"
            defaultValue={filters.to}
            aria-label="วันที่สิ้นสุด"
          />
          <input
            name="search"
            defaultValue={filters.search}
            placeholder="ค้นหาชื่อหรือรหัสนักเรียน"
          />
          <button className="button primary">
            <Search size={16} />
            ค้นหา
          </button>
        </form>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>รายวิชา</th>
                <th>ห้อง</th>
                <th>เข้าเรียน</th>
                <th>สาย</th>
                <th>ขาด</th>
                <th>ลา</th>
                <th>สถานะรอบ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.rows.length ? (
                history.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>
                      <b>{row.subject}</b>
                    </td>
                    <td>{row.room}</td>
                    <td>
                      <span className="status PRESENT">
                        {row.counts.PRESENT}
                      </span>
                    </td>
                    <td>
                      <span className="status LATE">{row.counts.LATE}</span>
                    </td>
                    <td>
                      <span className="status ABSENT">{row.counts.ABSENT}</span>
                    </td>
                    <td>
                      <span className="status LEAVE">{row.counts.LEAVE}</span>
                    </td>
                    <td>
                      <span
                        className={`status ${row.status === "CLOSED" ? "closed" : "active"}`}
                      >
                        {row.status === "CLOSED"
                          ? "ปิดรอบแล้ว"
                          : "กำลังดำเนินการ"}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="button secondary"
                        href={detailHref(row.id)}
                      >
                        ดูรายละเอียด
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <EmptyState title="ไม่พบประวัติการเช็คชื่อ" description="ลองเปลี่ยนรายวิชา ช่วงวันที่ หรือคำค้นหา" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {history.total > 0 && (
          <nav className="pagination" aria-label="แบ่งหน้าประวัติ">
            <span>
              รายการ {(history.page - 1) * history.pageSize + 1}–
              {Math.min(history.page * history.pageSize, history.total)} จาก{" "}
              {history.total}
            </span>
            <div>
              {history.page > 1 ? (
                <Link
                  className="button secondary"
                  href={pageHref(history.page - 1)}
                >
                  ก่อนหน้า
                </Link>
              ) : (
                <button className="button secondary" disabled>
                  ก่อนหน้า
                </button>
              )}
              <b>
                หน้า {history.page} / {history.totalPages}
              </b>
              {history.page < history.totalPages ? (
                <Link
                  className="button secondary"
                  href={pageHref(history.page + 1)}
                >
                  ถัดไป
                </Link>
              ) : (
                <button className="button secondary" disabled>
                  ถัดไป
                </button>
              )}
            </div>
          </nav>
        )}
      </section>
      <AttendanceIssues initial={issues} />
    </>
  );
}
