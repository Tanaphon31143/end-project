"use client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export type AttendanceChartPoint = { day: string; present: number; late: number; absent: number; leave?: number; total?: number; attendanceRate?: number };
export function AttendanceChart({ data = [], dashboard = false }: { data?: AttendanceChartPoint[]; dashboard?: boolean }) {
  return (
    <div className={dashboard ? "dashboard-chart-wrap" : ""}>
      <div className={dashboard ? "chart dashboard-chart" : "chart"}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={data.map((point) => ({ ...point, present: Number.isFinite(point.present) ? point.present : 0, late: Number.isFinite(point.late) ? point.late : 0, absent: Number.isFinite(point.absent) ? point.absent : 0, leave: Number.isFinite(point.leave) ? point.leave : 0 }))}
          margin={{ top: 10, right: 10, left: -24, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#e7eaf0" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dfe7f1", boxShadow: "0 10px 24px #14294d14", fontSize: 13 }} labelStyle={{ color: "#122b4a", fontWeight: 700 }} />
          {!dashboard && <Legend iconType="circle" />}
          <Line
            name="เข้าเรียน"
            dataKey="present"
            stroke="#16a36a"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
          <Line
            name={dashboard ? "มาสาย" : "สาย"}
            dataKey="late"
            stroke="#f2a51a"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
          <Line
            name="ขาดเรียน"
            dataKey="absent"
            stroke="#e34b4b"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
          {dashboard && <Line name="ลา" dataKey="leave" stroke="#647fa8" strokeWidth={2.5} dot={{ r: 3 }} />}
        </LineChart>
      </ResponsiveContainer>
      </div>
      {dashboard && <div className="dashboard-chart-legend" aria-label="คำอธิบายกราฟ">
        <span><i className="present" />เข้าเรียน</span><span><i className="late" />มาสาย</span><span><i className="absent" />ขาดเรียน</span><span><i className="leave" />ลา</span>
      </div>}
    </div>
  );
}
