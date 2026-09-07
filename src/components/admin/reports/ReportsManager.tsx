"use client";
import { useRef, useState } from "react";
import { Download, UserCheck, UserMinus, UserX, Users } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/admin/StatCard";
import type { ReportData } from "./types";
export default function ReportsManager({
  initialData,
}: {
  initialData: ReportData;
}) {
  const [data, setData] = useState(initialData),
    [filters, setFilters] = useState({
      from: "",
      to: "",
      classroomId: "",
      subjectId: "",
    }),
    [busy, setBusy] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  async function load() {
    setBusy(true);
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const r = await fetch(`/api/admin/reports?${q}`);
    setData(await r.json());
    setBusy(false);
  }
  async function excel() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      data.records.map((x) => ({
        วันที่: x.date,
        รหัสนักเรียน: x.studentCode,
        "ชื่อ-สกุล": x.studentName,
        ชั้นเรียน: x.className,
        รหัสวิชา: x.subjectCode,
        รายวิชา: x.subjectName,
        เวลา: x.time,
        สถานะ: labels[x.status],
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "attendance-report.xlsx");
  }
  async function pdf() {
    if (!reportRef.current) return;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(reportRef.current, {
      scale: 1.5,
      backgroundColor: "#f6f8fc",
    });
    const doc = new jsPDF("landscape", "mm", "a4"),
      w = 277,
      h = (canvas.height * w) / canvas.width;
    doc.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      10,
      10,
      w,
      Math.min(h, 190),
    );
    doc.save("attendance-report.pdf");
  }
  return (
    <main className="admin-content">
      <div className="page-intro">
        <div>
          <h2>รายงานการเข้าเรียน</h2>
          <p>วิเคราะห์ข้อมูลและส่งออกรายงานจากฐานข้อมูลจริง</p>
        </div>
        <div className="export-actions">
          <button className="admin-button secondary" onClick={excel}>
            <Download size={17} />
            Export Excel
          </button>
          <button className="admin-button primary" onClick={pdf}>
            <Download size={17} />
            Export PDF
          </button>
        </div>
      </div>
      <div className="admin-filters report-filters">
        <input
          aria-label="วันที่เริ่มต้น"
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          aria-label="วันที่สิ้นสุด"
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
        <select
          value={filters.classroomId}
          onChange={(e) =>
            setFilters({ ...filters, classroomId: e.target.value })
          }
        >
          <option value="">ทุกชั้นเรียน</option>
          {data.classrooms.map((x) => (
            <option value={x.id} key={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select
          value={filters.subjectId}
          onChange={(e) =>
            setFilters({ ...filters, subjectId: e.target.value })
          }
        >
          <option value="">ทุกรายวิชา</option>
          {data.subjects.map((x) => (
            <option value={x.id} key={x.id}>
              {x.code} {x.name}
            </option>
          ))}
        </select>
        <button
          className="admin-button secondary"
          onClick={load}
          disabled={busy}
        >
          {busy ? "กำลังโหลด..." : "แสดงรายงาน"}
        </button>
      </div>
      <div ref={reportRef}>
        <section className="stats-row">
          <StatCard
            icon={Users}
            title="นักเรียนทั้งหมด"
            value={data.summary.students.toLocaleString()}
            unit="คน"
            note={`ข้อมูล ${data.summary.total} รายการ`}
            tone="blue"
          />
          <StatCard
            icon={UserCheck}
            title="มาเรียนเฉลี่ย"
            value={data.summary.rate.toFixed(2)}
            unit="%"
            note={`${data.summary.present} รายการ`}
            tone="green"
          />
          <StatCard
            icon={UserMinus}
            title="มาสาย"
            value={data.summary.late.toLocaleString()}
            unit="ครั้ง"
            note="ตามช่วงเวลาที่เลือก"
            tone="orange"
          />
          <StatCard
            icon={UserX}
            title="ขาดเรียน"
            value={data.summary.absent.toLocaleString()}
            unit="ครั้ง"
            note="ตามช่วงเวลาที่เลือก"
            tone="purple"
          />
        </section>
        <section className="report-grid">
          <div className="dashboard-card">
            <div className="card-head">
              <div>
                <h2>สถิติการเข้าเรียน</h2>
                <p>ข้อมูลรายวันตามตัวกรอง</p>
              </div>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.daily}>
                  <CartesianGrid stroke="#edf1f6" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip />
                  <Bar
                    yAxisId="left"
                    dataKey="students"
                    fill="#4a7ef4"
                    radius={[5, 5, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    dataKey="rate"
                    stroke="#14b8d4"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="dashboard-card donut-card">
            <div className="card-head">
              <div>
                <h2>สัดส่วนการเข้าเรียน</h2>
                <p>ข้อมูลจริงตามช่วงเวลาที่เลือก</p>
              </div>
            </div>
            <div
              className="donut"
              style={{
                background: `conic-gradient(#22c55e 0 ${pct(data.summary.present, data.summary.total)}%,#f59e0b 0 ${pct(data.summary.present + data.summary.late, data.summary.total)}%,#ef4444 0 ${pct(data.summary.present + data.summary.late + data.summary.absent, data.summary.total)}%,#3b82f6 0)`,
              }}
            >
              <div>
                <strong>{data.summary.rate.toFixed(2)}%</strong>
                <span>มาเรียน</span>
              </div>
            </div>
            <ul>
              {(["PRESENT", "LATE", "ABSENT", "LEAVE"] as const).map((s, i) => (
                <li key={s}>
                  <i
                    className={["d-green", "d-orange", "d-red", "d-blue"][i]}
                  />
                  {labels[s]}
                  <b>
                    {pct(
                      s === "PRESENT"
                        ? data.summary.present
                        : s === "LATE"
                          ? data.summary.late
                          : s === "ABSENT"
                            ? data.summary.absent
                            : data.summary.leave,
                      data.summary.total,
                    ).toFixed(2)}
                    %
                  </b>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
const labels = { PRESENT: "มาเรียน", LATE: "สาย", ABSENT: "ขาด", LEAVE: "ลา" };
const pct = (n: number, t: number) => (t ? (100 * n) / t : 0);
