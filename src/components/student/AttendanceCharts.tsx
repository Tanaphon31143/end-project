"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
const monthly = [
    { m: "พ.ค.", v: 91 },
    { m: "มิ.ย.", v: 94 },
    { m: "ก.ค.", v: 92 },
    { m: "ส.ค.", v: 96 },
    { m: "ก.ย.", v: 98 },
  ],
  weekly = [
    { d: "จ.", v: 4 },
    { d: "อ.", v: 5 },
    { d: "พ.", v: 4 },
    { d: "พฤ.", v: 5 },
    { d: "ศ.", v: 3 },
  ],
  subjects = [
    { name: "คอมพิวเตอร์พื้นฐาน", value: 96 },
    { name: "เขียนโปรแกรม", value: 92 },
    { name: "ออกแบบเว็บไซต์", value: 98 },
    { name: "ฐานข้อมูล", value: 94 },
    { name: "อังกฤษ", value: 90 },
  ],
  colors = ["#1677ff", "#14a673", "#8b5bd4", "#f4a51c", "#f15b67"];
export default function AttendanceCharts() {
  return (
    <>
      <div className="grid chart-grid">
        <section className="card chart-card">
          <div className="section-head">
            <h2>อัตราเข้าเรียนรายเดือน</h2>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid stroke="#edf1f5" vertical={false} />
                <XAxis dataKey="m" axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#1677ff"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#1677ff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card chart-card">
          <div className="section-head">
            <h2>สัดส่วนตามรายวิชา</h2>
          </div>
          <div className="chart donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjects}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {subjects.map((_, i) => (
                    <Cell key={i} fill={colors[i]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {subjects.map((s, i) => (
              <span key={s.name}>
                <i style={{ background: colors[i] }} />
                {s.name}
              </span>
            ))}
          </div>
        </section>
      </div>
      <section className="card chart-card bar-card">
        <div className="section-head">
          <h2>จำนวนคาบที่เข้าเรียนรายสัปดาห์</h2>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekly}>
              <CartesianGrid stroke="#edf1f5" vertical={false} />
              <XAxis dataKey="d" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="v" fill="#1677ff" radius={[7, 7, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
