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
const data = [
  { day: "พฤ. 27", present: 79, late: 11, absent: 10 },
  { day: "ศ. 28", present: 84, late: 9, absent: 7 },
  { day: "จ. 31", present: 88, late: 7, absent: 5 },
  { day: "อ. 1", present: 82, late: 12, absent: 6 },
  { day: "พ. 2", present: 91, late: 5, absent: 4 },
  { day: "พฤ. 3", present: 86, late: 8, absent: 6 },
];
export function AttendanceChart() {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 12, left: -22, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#e7eaf0" />
          <XAxis dataKey="day" axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
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
