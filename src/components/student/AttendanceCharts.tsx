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
import type { StudentStats } from "@/lib/student-data";
const colors = [
  "#1677ff",
  "#14a673",
  "#8b5bd4",
  "#f4a51c",
  "#f15b67",
  "#27a9b9",
];
export default function AttendanceCharts({
  monthly,
  weekly,
  subjects,
}: Pick<StudentStats, "monthly" | "weekly" | "subjects">) {
  return (
    <>
      <div className="grid chart-grid">
        <section className="card chart-card">
          <div className="section-head">
            <h2>อัตราเข้าเรียนรายเดือน</h2>
          </div>
          <div className="chart">
            {monthly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid stroke="#edf1f5" vertical={false} />
                  <XAxis dataKey="m" axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="v"
                    name="อัตราเข้าเรียน"
                    unit="%"
                    stroke="#1677ff"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#1677ff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-note">ยังไม่มีข้อมูลรายเดือน</p>
            )}
          </div>
        </section>
        <section className="card chart-card">
          <div className="section-head">
            <h2>อัตราเข้าเรียนตามรายวิชา</h2>
          </div>
          <div className="chart donut">
            {subjects.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjects}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {subjects.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-note">ยังไม่มีข้อมูลรายวิชา</p>
            )}
          </div>
          <div className="chart-legend">
            {subjects.map((s, i) => (
              <span key={s.name}>
                <i style={{ background: colors[i % colors.length] }} />
                {s.name}
              </span>
            ))}
          </div>
        </section>
      </div>
      <section className="card chart-card bar-card">
        <div className="section-head">
          <h2>จำนวนคาบที่เข้าเรียนใน 7 วันล่าสุด</h2>
        </div>
        <div className="chart">
          {weekly.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid stroke="#edf1f5" vertical={false} />
                <XAxis dataKey="d" axisLine={false} tickLine={false} />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar
                  dataKey="v"
                  name="จำนวนคาบ"
                  fill="#1677ff"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-note">ยังไม่มีข้อมูลในช่วง 7 วันล่าสุด</p>
          )}
        </div>
      </section>
    </>
  );
}
