"use client";

import { CalendarX2, ChevronDown } from "lucide-react";
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StudentStats } from "@/lib/student-data";

const statusColors = {
  present: "#12b76a",
  late: "#f79009",
  absent: "#f04438",
  leave: "#7f56d9",
};

type AttendanceChartsProps = {
  monthly: StudentStats["monthly"];
  summary: StudentStats["summary"];
};

function MonthlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: StudentStats["monthly"][number] }>;
  label?: string;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  const total = item.present + item.late + item.absent + item.leave;
  const rate = total ? (((item.present + item.late) * 100) / total).toFixed(1) : "0.0";
  return (
    <div className="statistics-chart-tooltip">
      <strong>{label}</strong>
      <span><i style={{ background: statusColors.present }} />มาเรียน <b>{item.present}</b></span>
      <span><i style={{ background: statusColors.late }} />มาสาย <b>{item.late}</b></span>
      <span><i style={{ background: statusColors.absent }} />ขาดเรียน <b>{item.absent}</b></span>
      <span><i style={{ background: statusColors.leave }} />ลา <b>{item.leave}</b></span>
      <small>อัตราการเข้าเรียน <b>{rate}%</b></small>
    </div>
  );
}

export default function AttendanceCharts({ monthly, summary }: AttendanceChartsProps) {
  const hasMonthlyTrend = monthly.length > 1;
  const distribution = [
    { key: "present", name: "มาเรียน", value: summary.present, color: statusColors.present },
    { key: "late", name: "มาสาย", value: summary.late, color: statusColors.late },
    { key: "absent", name: "ขาดเรียน", value: summary.absent, color: statusColors.absent },
    { key: "leave", name: "ลา", value: summary.leave, color: statusColors.leave },
  ];

  return (
    <section className="statistics-charts-grid" aria-label="กราฟสถิติการเข้าเรียน">
      <article className="statistics-chart-card statistics-monthly-chart">
        <header className="statistics-card-heading">
          <div className="statistics-section-title">
            <div>
              <h2>แนวโน้มการเข้าเรียน</h2>
              <p>แสดงจำนวนครั้งของการเข้าเรียนในแต่ละเดือน และอัตราการเข้าเรียน</p>
            </div>
          </div>
          <span>{monthly.length} เดือนล่าสุด <ChevronDown aria-hidden="true" /></span>
        </header>

        {monthly.length ? (
          <>
            <div className="statistics-chart-legend" aria-label="คำอธิบายสีกราฟ">
              {distribution.map((item) => (
                <span key={item.key}><i style={{ background: item.color }} />{item.name}</span>
              ))}
              {hasMonthlyTrend && <span className="is-line"><i />อัตราการเข้าเรียน (%)</span>}
            </div>
            <div className="statistics-chart" role="img" aria-label="กราฟแนวโน้มสถิติการเข้าเรียนรายเดือน">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthly} barGap={3} margin={{ top: 24, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#e8eef5" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={12} />
                  <YAxis yAxisId="count" allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} padding={{ top: 14, bottom: 18 }} hide />
                  <Tooltip cursor={{ fill: "#f7f8fa" }} content={<MonthlyTooltip />} />
                  <Bar yAxisId="count" dataKey="present" name="มาเรียน" fill={statusColors.present} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar yAxisId="count" dataKey="late" name="มาสาย" fill={statusColors.late} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar yAxisId="count" dataKey="absent" name="ขาดเรียน" fill={statusColors.absent} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  <Bar yAxisId="count" dataKey="leave" name="ลา" fill={statusColors.leave} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  {hasMonthlyTrend && (
                    <Line yAxisId="rate" type="monotone" dataKey="rate" name="อัตราการเข้าเรียน" stroke="#1677ff" strokeWidth={2.25} dot={{ r: 4, fill: "#1677ff", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 5 }}>
                      <LabelList dataKey="rate" position="top" offset={8} formatter={(value) => `${Number(value ?? 0)}%`} fill="#146bd1" fontSize={10} fontWeight={700} />
                    </Line>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="statistics-empty-state is-chart">
            <CalendarX2 aria-hidden="true" />
            <strong>ยังไม่มีข้อมูลการเข้าเรียนในช่วงเวลานี้</strong>
            <p>ลองเปลี่ยนภาคเรียน ช่วงเวลา หรือรายวิชา</p>
          </div>
        )}
      </article>

      <article className="statistics-chart-card statistics-distribution-card">
        <header className="statistics-card-heading">
          <div className="statistics-section-title">
            <div>
              <h2>สัดส่วนการเข้าเรียนรวม</h2>
              <p>แสดงสัดส่วนจำนวนของสถานะการเข้าเรียนทั้งหมด</p>
            </div>
          </div>
          <span>ทั้งหมด <ChevronDown aria-hidden="true" /></span>
        </header>

        {summary.total ? (
          <div className="statistics-donut-layout">
            <div className="statistics-donut" role="img" aria-label="กราฟวงกลมสัดส่วนการเข้าเรียน">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={57}
                    outerRadius={84}
                    paddingAngle={1}
                    stroke="none"
                  >
                    {distribution.map((item) => <Cell key={item.key} fill={item.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString("th-TH")} ครั้ง`, "จำนวน"]}
                    contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <span><small>ทั้งหมด</small><strong>{summary.total.toLocaleString("th-TH")}</strong><small>ครั้ง</small></span>
            </div>

            <div className="statistics-distribution-list">
              {distribution.map((item) => {
                const rate = summary.total ? ((item.value * 100) / summary.total).toFixed(1) : "0.0";
                return (
                  <div key={item.key}>
                    <span><i style={{ background: item.color }} />{item.name}</span>
                    <strong>{item.value.toLocaleString("th-TH")} <small>ครั้ง</small></strong>
                    <em>{rate}%</em>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="statistics-empty-state is-chart">
            <CalendarX2 aria-hidden="true" />
            <strong>ยังไม่มีข้อมูลการเข้าเรียนในช่วงเวลานี้</strong>
            <p>กราฟจะแสดงเมื่อมีรายการเช็คชื่อ</p>
          </div>
        )}
      </article>
    </section>
  );
}
