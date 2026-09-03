"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { attendanceData } from "@/data/dashboard";

export function AttendanceChart() {
  return <section className="dashboard-card chart-card">
    <div className="card-head"><div><h2>สถิติการเข้าเรียน</h2><p>ภาพรวมการเช็คชื่อของนักเรียน</p></div><select aria-label="เลือกช่วงเวลา" defaultValue="7"><option value="7">7 วันที่ผ่านมา</option><option value="30">30 วันที่ผ่านมา</option></select></div>
    <div className="legend"><span><i className="bar-dot" />จำนวนคนมาเรียน</span><span><i className="line-dot" />อัตราการเข้าเรียน</span></div>
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={attendanceData} margin={{ top: 8, right: 6, bottom: 0, left: -16 }}>
          <defs><linearGradient id="attendanceBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3775ff"/><stop offset="100%" stopColor="#8bb4ff"/></linearGradient></defs>
          <CartesianGrid stroke="#edf1f6" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#778397", fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
          <YAxis yAxisId="left" domain={[0, 1300]} tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 8px 30px rgba(15,23,42,.1)", fontFamily: "inherit" }} formatter={(value, name) => [name === "อัตราการเข้าเรียน" ? `${Number(value).toFixed(2)}%` : `${Number(value).toLocaleString()} คน`, name]} />
          <Bar yAxisId="left" dataKey="students" name="จำนวนคนมาเรียน" fill="url(#attendanceBar)" radius={[6, 6, 0, 0]} barSize={28} />
          <Line yAxisId="right" type="monotone" dataKey="rate" name="อัตราการเข้าเรียน" stroke="#14b8d4" strokeWidth={3} dot={{ r: 4, fill: "#fff", stroke: "#14b8d4", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </section>;
}
