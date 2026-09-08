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
export function AttendanceChart({ data = [] }: { data?: AttendanceChartPoint[] }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 12, left: -22, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#e7eaf0" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip />
          <Legend iconType="circle" />
          <Line
            name="เข้าเรียน"
            dataKey="present"
            stroke="#16a36a"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
          <Line
            name="สาย"
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
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
