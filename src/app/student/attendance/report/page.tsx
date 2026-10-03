import { redirect } from "next/navigation";
import { Badge, PageTitle } from "@/components/student/UI";
import IssueForm from "@/components/student/IssueForm";
import IssueAttachments from "@/components/student/IssueAttachments";
import { getStudentSession } from "@/lib/auth";
import { getStudentCourses, getStudentIssues } from "@/lib/student-data";
export const dynamic = "force-dynamic";
type ReportSearchParams = Promise<{ subject?: string; date?: string }>;
export default async function Report({ searchParams }: { searchParams?: ReportSearchParams }) {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const query = searchParams ? await searchParams : {};
  const [courses, issues] = await Promise.all([
    getStudentCourses(session.id),
    getStudentIssues(session.id),
  ]);
  return (
    <>
      <PageTitle
        eyebrow="ศูนย์ช่วยเหลือ"
        title="เช็คชื่อแล้วมีปัญหา? บอกเราได้เลย"
        description="ส่งรายละเอียดให้เจ้าหน้าที่ตรวจสอบและติดตามผลได้ที่หน้านี้"
      />
      <IssueForm initialSubject={query.subject || ""} initialDate={query.date || ""} courses={courses.map((c) => ({ id: c.id, name: c.name, room: c.room, startTime: c.startTime }))} />
      <section className="card report-history">
        <div className="section-head">
          <div>
            <h2>ประวัติการแจ้งปัญหา</h2>
            <p>คำร้องทั้งหมด {issues.length} รายการ</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>เลขที่</th>
                <th>วันที่แจ้ง</th>
                <th>รายวิชา</th>
                <th>ประเภทปัญหา</th>
                <th>สถานะ</th>
                <th>ผลการดำเนินการ</th>
                <th>รูปแนบ</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td>{r.createdAt}</td>
                  <td>
                    <strong>{r.subject}</strong>
                  </td>
                  <td>{r.issueType}</td>
                  <td>
                    <Badge>{r.status}</Badge>
                  </td>
                  <td>{r.resolution}</td>
                  <td>
                    {r.hasAttachment ? (
                      <IssueAttachments reportId={r.id} />
                    ) : (
                      "ไม่มีรูปแนบ"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!issues.length && (
            <p className="empty-note">ยังไม่มีประวัติการแจ้งปัญหา</p>
          )}
        </div>
        <div className="report-history-mobile" aria-label="ประวัติการแจ้งปัญหาแบบรายการ">
          {issues.map((r) => <article key={r.id} className="report-history-item"><div className="report-history-item-top"><strong>#{r.id}</strong><Badge>{r.status}</Badge></div><dl><div><dt>วันที่แจ้ง</dt><dd>{r.createdAt}</dd></div><div><dt>รายวิชา</dt><dd>{r.subject}</dd></div><div><dt>ประเภทปัญหา</dt><dd>{r.issueType}</dd></div><div><dt>ผลการดำเนินการ</dt><dd>{r.resolution}</dd></div><div><dt>รูปแนบ</dt><dd>{r.hasAttachment ? <IssueAttachments reportId={r.id} /> : "ไม่มีรูปแนบ"}</dd></div></dl></article>)}
          {!issues.length && <p className="empty-note">ยังไม่มีคำร้อง เมื่อส่งคำร้องแล้ว สถานะจะแสดงที่นี่</p>}
        </div>
      </section>
    </>
  );
}
