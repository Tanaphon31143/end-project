import { redirect } from "next/navigation";
import { CalendarCheck, Clock3, Percent, UserMinus, UserX } from "lucide-react";
import AttendanceCharts from "@/components/student/AttendanceCharts";
import { PageTitle, StatCard } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { getStudentStatistics } from "@/lib/student-data";
export const dynamic = "force-dynamic";
export default async function Statistics() {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const data = await getStudentStatistics(session.id),
    s = data.summary,
    p = (n: number) =>
      s.total ? `${((n * 100) / s.total).toFixed(1)}%` : "0%";
  return (
    <>
      <PageTitle
        eyebrow="ข้อมูลการเข้าเรียนจริง"
        title="สถิติการเข้าเรียน"
        description="ภาพรวมและแนวโน้มจากรายการเช็คชื่อของคุณ"
      />
      <div className="grid stats-grid">
        <StatCard
          label="มาเรียน"
          value={s.present}
          detail={p(s.present)}
          icon={CalendarCheck}
          tone="green"
        />
        <StatCard
          label="มาสาย"
          value={s.late}
          detail={p(s.late)}
          icon={Clock3}
          tone="orange"
        />
        <StatCard
          label="ขาด"
          value={s.absent}
          detail={p(s.absent)}
          icon={UserX}
          tone="red"
        />
        <StatCard
          label="ลา"
          value={s.leave}
          detail={p(s.leave)}
          icon={UserMinus}
          tone="purple"
        />
        <StatCard
          label="อัตราเข้าเรียน"
          value={`${s.rate}%`}
          detail={s.rate >= 80 ? "เกณฑ์ดี" : "ควรปรับปรุง"}
          icon={Percent}
        />
      </div>
      <AttendanceCharts
        monthly={data.monthly}
        weekly={data.weekly}
        subjects={data.subjects}
      />
      <section className="card summary-table">
        <div className="section-head">
          <h2>สรุปตามรายวิชา</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>รายวิชา</th>
                <th>ทั้งหมด</th>
                <th>มาเรียน</th>
                <th>สาย</th>
                <th>ขาด</th>
                <th>ลา</th>
                <th>อัตราเข้าเรียน</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((r) => (
                <tr key={r.name}>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td>{r.total}</td>
                  <td>{r.present}</td>
                  <td>{r.late}</td>
                  <td>{r.absent}</td>
                  <td>{r.leave}</td>
                  <td>{r.value}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.subjects.length && (
            <p className="empty-note">ยังไม่มีข้อมูลสำหรับสรุปตามรายวิชา</p>
          )}
        </div>
      </section>
    </>
  );
}
