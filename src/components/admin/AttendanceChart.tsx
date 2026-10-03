"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";

export function AttendanceChart({
  data,
}: {
  data: { date: string; day: string; students: number; rate: number }[];
}) {
  const [range, setRange] = useState<"7" | "30">("7");
  const visibleData = data.slice(range === "7" ? -7 : -30);
  return (
    <section className="dashboard-card chart-card">
      <div className="card-head">
        <div>
          <h2>สถิติการเข้าเรียน</h2>
          <p>ภาพรวมการเช็คชื่อของนักเรียน</p>
        </div>
        <select aria-label="เลือกช่วงเวลา" value={range} onChange={(event) => setRange(event.target.value as "7" | "30")}>
          <option value="7">7 วันที่ผ่านมา</option>
          <option value="30">30 วันที่ผ่านมา</option>
        </select>
      </div>
      <div className="legend">
        <span>
          <i className="bar-dot" />
          จำนวนคนมาเรียน
        </span>
        <span>
          <i className="line-dot" />
          อัตราการเข้าเรียน
        </span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 8, right: 6, bottom: 0, left: -16 }}
          >
            <defs>
              <linearGradient id="attendanceArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#edf1f6" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: "#536e8d", fontSize: 13, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              domain={[0, "auto"]}
              tick={{ fill: "#637d9b", fontSize: 13, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              unit="%"
              tick={{ fill: "#637d9b", fontSize: 13, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                boxShadow: "0 8px 30px rgba(15,23,42,.1)",
                fontFamily: "inherit",
              }}
              formatter={(value, name) => [
                name === "อัตราการเข้าเรียน"
                  ? `${Number(value).toFixed(2)}%`
                  : `${Number(value).toLocaleString()} คน`,
                name,
              ]}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="students"
              name="จำนวนนักเรียน"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#attendanceArea)"
              dot={{ r: 4, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rate"
              name="อัตราการเข้าเรียน"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
