import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { Badge, PageTitle } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { getStudentAttendance, getStudentCourses } from "@/lib/student-data";
export const dynamic = "force-dynamic";
export default async function History({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    subject?: string;
    status?: string;
  }>;
}) {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const q = await searchParams,
    subjectId = Number(q.subject) || undefined;
  const [records, courses] = await Promise.all([
    getStudentAttendance(session.id, {
      from: q.from,
      to: q.to,
      subjectId,
      status: q.status,
    }),
    getStudentCourses(session.id),
  ]);
  return (
    <>
      <PageTitle
        eyebrow="บันทึกย้อนหลัง"
        title="ประวัติการเข้าเรียน"
        description="ค้นหาและตรวจสอบข้อมูลการเข้าเรียนจากฐานข้อมูล"
      />
      <form className="card filters" method="get">
        <div className="field">
          <label>จากวันที่</label>
          <input
            name="from"
            className="input"
            type="date"
            defaultValue={q.from}
          />
        </div>
        <div className="field">
          <label>ถึงวันที่</label>
          <input name="to" className="input" type="date" defaultValue={q.to} />
        </div>
        <div className="field">
          <label>รายวิชา</label>
          <select
            name="subject"
            className="select"
            defaultValue={q.subject || ""}
          >
            <option value="">ทุกรายวิชา</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>สถานะ</label>
          <select
            name="status"
            className="select"
            defaultValue={q.status || ""}
          >
            <option value="">ทุกสถานะ</option>
            <option value="present">มาเรียน</option>
            <option value="late">สาย</option>
            <option value="absent">ขาด</option>
            <option value="leave">ลา</option>
          </select>
        </div>
        <button className="button primary">
          <Search size={17} /> ค้นหา
        </button>
      </form>
      <section className="card">
        <div className="section-head">
          <div>
            <h2>รายการเข้าเรียน</h2>
            <p>พบทั้งหมด {records.length} รายการ</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>รายวิชา</th>
                <th>เวลาเรียน</th>
                <th>เวลาเข้าเรียน</th>
                <th>สถานะ</th>
                <th>หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((a) => (
                <tr key={a.id}>
                  <td>{a.date}</td>
                  <td>
                    <strong>{a.subject}</strong>
                    <br />
                    <small>{a.subjectCode}</small>
                  </td>
                  <td>{a.classTime}</td>
                  <td>{a.checkIn}</td>
                  <td>
                    <Badge>{a.status}</Badge>
                  </td>
                  <td>{a.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!records.length && (
            <p className="empty-note">
              ไม่พบประวัติการเข้าเรียนตามเงื่อนไขที่เลือก
            </p>
          )}
        </div>
      </section>
    </>
  );
}
