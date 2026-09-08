import { redirect } from "next/navigation";
import { Badge, PageTitle } from "@/components/student/UI";
import IssueForm from "@/components/student/IssueForm";
import { getStudentSession } from "@/lib/auth";
import { getStudentCourses, getStudentIssues } from "@/lib/student-data";
export const dynamic = "force-dynamic";
export default async function Report() {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const [courses, issues] = await Promise.all([
    getStudentCourses(session.id),
    getStudentIssues(session.id),
  ]);
  return (
    <>
      <PageTitle
        eyebrow="ศูนย์ช่วยเหลือ"
        title="แจ้งปัญหาการเช็คชื่อ"
        description="ส่งรายละเอียดให้เจ้าหน้าที่ตรวจสอบและติดตามผลได้ที่หน้านี้"
      />
      <section className="card card-pad report-card">
        <h2>รายละเอียดปัญหา</h2>
        <p>กรอกข้อมูลให้ครบถ้วนเพื่อช่วยให้ตรวจสอบได้รวดเร็วขึ้น</p>
        <IssueForm
          courses={courses.map((c) => ({
            id: c.id,
            name: c.name,
            room: c.room,
            startTime: c.startTime,
          }))}
        />
      </section>
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
                </tr>
              ))}
            </tbody>
          </table>
          {!issues.length && (
            <p className="empty-note">ยังไม่มีประวัติการแจ้งปัญหา</p>
          )}
        </div>
      </section>
    </>
  );
}
