import Link from "next/link";
import { UsersRound } from "lucide-react";
type Row = {
  id: string;
  name: string;
  room: string;
  time: string;
  status: string;
};
export function RecentAttendanceTable({ rows }: { rows: Row[] }) {
  return (
    <section className="dashboard-card table-card">
      <div className="card-head">
        <div className="dashboard-section-title">
          <span className="section-icon violet"><UsersRound size={18} /></span>
          <div>
            <h2>รายการเข้าเรียนล่าสุด</h2>
            <p>ข้อมูลล่าสุดจากฐานข้อมูล</p>
          </div>
        </div>
        <Link className="card-head-link" href="/admin/attendance">ดูทั้งหมด</Link>
      </div>
      <div className="attendance-table-wrap">
        <table>
          <thead>
            <tr>
              <th>รหัสนักเรียน</th>
              <th>ชื่อ-สกุล</th>
              <th>ชั้น</th>
              <th>เวลา</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id}-${index}`}>
                <td>{row.id}</td>
                <td>
                  <div className="student-name">
                    <span className="student-avatar blue">
                      {row.name.slice(0, 2)}
                    </span>
                    <b>{row.name}</b>
                  </div>
                </td>
                <td>{row.room}</td>
                <td>{row.time}</td>
                <td>
                  <span
                    className={`status-badge ${row.status === "มาเรียน" ? "present" : row.status === "สาย" ? "late" : "absent"}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5}>ยังไม่มีข้อมูลการเข้าเรียน</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
