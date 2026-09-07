import { CalendarCheck, Clock3, Percent, UserMinus, UserX } from "lucide-react";
import AttendanceCharts from "@/components/student/AttendanceCharts";
import { PageTitle, StatCard } from "@/components/student/UI";
export default function Statistics() {
  return (
    <>
      <PageTitle
        eyebrow="ภาคเรียนที่ 1/2569"
        title="สถิติการเข้าเรียน"
        description="ภาพรวมและแนวโน้มการเข้าเรียนของคุณ"
      />
      <div className="grid stats-grid">
        <StatCard
          label="มาเรียน"
          value="42"
          detail="91.3%"
          icon={CalendarCheck}
          tone="green"
        />
        <StatCard
          label="มาสาย"
          value="2"
          detail="4.3%"
          icon={Clock3}
          tone="orange"
        />
        <StatCard label="ขาด" value="1" detail="2.2%" icon={UserX} tone="red" />
        <StatCard
          label="ลา"
          value="1"
          detail="2.2%"
          icon={UserMinus}
          tone="purple"
        />
        <StatCard
          label="อัตราเข้าเรียน"
          value="95.7%"
          detail="เกณฑ์ดีมาก"
          icon={Percent}
        />
      </div>
      <AttendanceCharts />
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
              {[
                ["คอมพิวเตอร์พื้นฐาน", 10, 9, 1, 0, 0, "95%"],
                ["การเขียนโปรแกรมเบื้องต้น", 9, 8, 0, 1, 0, "89%"],
                ["การออกแบบเว็บไซต์", 10, 10, 0, 0, 0, "100%"],
                ["ฐานข้อมูลเบื้องต้น", 9, 8, 0, 0, 1, "94%"],
                ["ภาษาอังกฤษเพื่อคอมพิวเตอร์", 8, 7, 1, 0, 0, "94%"],
              ].map((r) => (
                <tr key={r[0]}>
                  {r.map((v, i) => (
                    <td key={i}>{i === 0 ? <strong>{v}</strong> : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
