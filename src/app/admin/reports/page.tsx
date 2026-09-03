import { Download, UserCheck, UserMinus, UserX, Users } from "lucide-react";
import { AttendanceChart } from "@/components/admin/AttendanceChart";
import { StatCard } from "@/components/admin/StatCard";
export default function ReportsPage() {
  return (
    <main className="admin-content">
      <div className="page-intro">
        <div>
          <h2>รายงานการเข้าเรียน</h2>
          <p>วิเคราะห์ข้อมูลและส่งออกรายงาน</p>
        </div>
        <div className="export-actions">
          <button className="admin-button secondary">
            <Download size={17} />
            Export Excel
          </button>
          <button className="admin-button primary">
            <Download size={17} />
            Export PDF
          </button>
        </div>
      </div>
      <div className="admin-filters report-filters">
        <select aria-label="วันที่">
          <option>1–15 พฤษภาคม 2569</option>
        </select>
        <select aria-label="ชั้นเรียน">
          <option>ทุกชั้นเรียน</option>
        </select>
        <select aria-label="รายวิชา">
          <option>ทุกรายวิชา</option>
        </select>
        <button className="admin-button secondary">แสดงรายงาน</button>
      </div>
      <section className="stats-row">
        <StatCard
          icon={Users}
          title="นักเรียนทั้งหมด"
          value="1,250"
          unit="คน"
          note="ข้อมูลปัจจุบัน"
          tone="blue"
        />
        <StatCard
          icon={UserCheck}
          title="มาเรียนเฉลี่ย"
          value="88.16"
          unit="%"
          note="เพิ่มขึ้น 2.4%"
          tone="green"
        />
        <StatCard
          icon={UserMinus}
          title="มาสายเฉลี่ย"
          value="5.44"
          unit="%"
          note="68 คนต่อวัน"
          tone="orange"
        />
        <StatCard
          icon={UserX}
          title="ขาดเรียนเฉลี่ย"
          value="3.36"
          unit="%"
          note="42 คนต่อวัน"
          tone="purple"
        />
      </section>
      <section className="report-grid">
        <AttendanceChart />
        <div className="dashboard-card donut-card">
          <div className="card-head">
            <div>
              <h2>สัดส่วนการเข้าเรียน</h2>
              <p>ข้อมูลเฉลี่ยตามช่วงเวลาที่เลือก</p>
            </div>
          </div>
          <div className="donut">
            <div>
              <strong>88.16%</strong>
              <span>มาเรียน</span>
            </div>
          </div>
          <ul>
            <li>
              <i className="d-green" />
              มาเรียน <b>88.16%</b>
            </li>
            <li>
              <i className="d-orange" />
              มาสาย <b>5.44%</b>
            </li>
            <li>
              <i className="d-red" />
              ขาด <b>3.36%</b>
            </li>
            <li>
              <i className="d-blue" />
              ลา <b>3.04%</b>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
