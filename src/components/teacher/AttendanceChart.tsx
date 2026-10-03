"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export type AttendanceChartPoint = {
  day: string;
  present: number;
  late: number;
  absent: number;
  leave?: number;
  total?: number;
  attendanceRate?: number;
};
export function AttendanceChart({
  data = [],
  dashboard = false,
}: {
  data?: AttendanceChartPoint[];
  dashboard?: boolean;
}) {
  const safeData = data.map((point) => ({
    ...point,
    present: Number.isFinite(point.present) ? point.present : 0,
    late: Number.isFinite(point.late) ? point.late : 0,
    absent: Number.isFinite(point.absent) ? point.absent : 0,
    leave: Number.isFinite(point.leave) ? point.leave : 0,
    attendanceRate: Number.isFinite(point.attendanceRate)
      ? point.attendanceRate
      : 0,
  }));

  if (dashboard) {
    return (
      <div className="dashboard-chart-wrap">
        <div className="chart dashboard-chart">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={safeData} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e7edf5" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#647995", fontSize: 11 }} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: "#647995", fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: "#eef5ff" }}
                contentStyle={{ borderRadius: 10, border: "1px solid #dfe7f1", boxShadow: "0 10px 24px #14294d14", fontSize: 12 }}
                labelStyle={{ color: "#122b4a", fontWeight: 700 }}
              />
              <Bar name="อัตราเข้าเรียน (%)" dataKey="attendanceRate" fill="#5b9df5" radius={[6, 6, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={safeData}
            margin={{ top: 10, right: 10, left: -24, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="4 4" stroke="#e7eaf0" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #dfe7f1",
                boxShadow: "0 10px 24px #14294d14",
                fontSize: 13,
              }}
              labelStyle={{ color: "#122b4a", fontWeight: 700 }}
            />
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
    </div>
  );
}
