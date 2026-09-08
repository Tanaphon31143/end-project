import Link from "next/link";
import { Search } from "lucide-react";
import { redirect } from "next/navigation";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherCourses, getTeacherHistory } from "@/lib/teacher-data";

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
  const subjectId =
    Number(value(query.subjectId) || value(query.course)) || undefined;
  const filters = {
    subjectId,
    from: value(query.from),
    to: value(query.to),
    search: value(query.search),
    page: Number(value(query.page)) || 1,
  };
  const [courses, history] = await Promise.all([
    getTeacherCourses(session.id),
    getTeacherHistory(session.id, filters),
  ]);
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (subjectId) params.set("subjectId", String(subjectId));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.search) params.set("search", filters.search);
    params.set("page", String(page));
    return `/teacher/history?${params}`;
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h2>ประวัติการเข้าเรียน</h2>
          <p>ค้นหาและตรวจสอบผลการเช็คชื่อย้อนหลัง</p>
        </div>
      </div>
      <section className="panel">
        <form className="filters" method="get">
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
          <input
            name="from"
            type="date"
            defaultValue={filters.from}
            aria-label="วันที่เริ่มต้น"
          />
          <input
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
                        href={`/teacher/history/${row.id}`}
                      >
                        ดูรายละเอียด
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      <h3>ไม่พบประวัติการเช็คชื่อ</h3>
                      <p>ลองเปลี่ยนรายวิชา ช่วงวันที่ หรือคำค้นหา</p>
                    </div>
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
    </>
  );
}
