"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  FileBarChart,
  FileSpreadsheet,
  LoaderCircle,
} from "lucide-react";
import {
  AttendanceChart,
  type AttendanceChartPoint,
} from "@/components/teacher/AttendanceChart";

type Mode = "daily" | "weekly" | "monthly";
type Report = {
  attendanceRate: number;
  total: number;
  counts: Record<"PRESENT" | "LATE" | "ABSENT" | "LEAVE", number>;
  trend: AttendanceChartPoint[];
};
const modes: Array<{ value: Mode; label: string }> = [
  { value: "daily", label: "รายวัน" },
  { value: "weekly", label: "รายสัปดาห์" },
  { value: "monthly", label: "รายเดือน" },
];
const dateKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export function ReportsClient({
  courses,
}: {
  courses: Array<{ id: number; code: string; name: string }>;
}) {
  const today = dateKey(new Date());
  const earlier = new Date();
  earlier.setDate(earlier.getDate() - 30);
  const [mode, setMode] = useState<Mode>("weekly");
  const [subjectId, setSubjectId] = useState("");
  const [from, setFrom] = useState(dateKey(earlier));
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ mode, from, to });
      if (subjectId) query.set("subjectId", subjectId);
      const response = await fetch(`/api/teacher/reports?${query}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "สร้างรายงานไม่สำเร็จ");
      setReport(data);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "สร้างรายงานไม่สำเร็จ",
      );
    } finally {
      setLoading(false);
    }
  }, [from, mode, subjectId, to]);

  const exportRows = () =>
    report?.trend.map((row) => ({
      ช่วงเวลา: row.day,
      เข้าเรียน: row.present,
      มาสาย: row.late,
      ขาดเรียน: row.absent,
      ลา: row.leave ?? 0,
      "อัตราเข้าเรียน (%)": row.attendanceRate ?? 0,
    })) ?? [];
  async function exportExcel() {
    if (!report) return;
    setExporting("xlsx");
    setError("");
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet([
          {
            รายงาน: "การเข้าเรียน",
            ช่วงวันที่: `${from} ถึง ${to}`,
            "อัตราเข้าเรียนเฉลี่ย (%)": report.attendanceRate,
            เข้าเรียน: report.counts.PRESENT,
            มาสาย: report.counts.LATE,
            ขาดเรียน: report.counts.ABSENT,
            ลา: report.counts.LEAVE,
          },
        ]),
        "สรุป",
      );
      XLSX.utils.book_append_sheet(
        book,
        XLSX.utils.json_to_sheet(exportRows()),
        "รายละเอียด",
      );
      XLSX.writeFile(book, `teacher-attendance-${from}-${to}.xlsx`);
    } catch {
      setError("ไม่สามารถส่งออก Excel ได้ กรุณาลองใหม่");
    } finally {
      setExporting("");
    }
  }
  async function exportPdf() {
    const target = document.getElementById("teacher-report-export");
    if (!report || !target) return;
    setExporting("pdf");
    setError("");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(target, {
        scale: 1.5,
        backgroundColor: "#eef1f7",
        useCORS: true,
      });
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });
      const width = pdf.internal.pageSize.getWidth() - 16,
        height = (canvas.height * width) / canvas.width;
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.92),
        "JPEG",
        8,
        8,
        width,
        Math.min(height, pdf.internal.pageSize.getHeight() - 16),
      );
      pdf.save(`teacher-attendance-${from}-${to}.pdf`);
    } catch {
      setError("ไม่สามารถส่งออก PDF ได้ กรุณาลองใหม่");
    } finally {
      setExporting("");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  return (
    <>
      <div className="page-head">
        <div>
          <h2>รายงานการเข้าเรียน</h2>
          <p>สรุปข้อมูลเฉพาะรายวิชาที่คุณรับผิดชอบ</p>
        </div>
      </div>
      <div className="tabs">
        {modes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMode(item.value)}
            className={`tab ${mode === item.value ? "active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section className="panel">
        <form
          className="filters"
          style={{ gridTemplateColumns: "1.4fr 1fr 1fr auto" }}
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            aria-label="รายวิชา"
          >
            <option value="">ทุกรายวิชา</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} {course.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="วันที่เริ่มต้น"
            required
          />
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            aria-label="วันที่สิ้นสุด"
            required
          />
          <button className="button primary" disabled={loading}>
            {loading ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <FileBarChart size={17} />
            )}
            {loading ? "กำลังสร้าง" : "สร้างรายงาน"}
          </button>
        </form>
        {error && <p className="form-message error">{error}</p>}
      </section>
      {loading && !report ? (
        <div className="panel loading-panel">
          <div className="skeleton table" />
        </div>
      ) : report ? (
        <div id="teacher-report-export">
          <section className="report-summary">
            <div className="summary-box">
              <span>อัตราการเข้าเรียนเฉลี่ย</span>
              <b className="green">{report.attendanceRate.toFixed(1)}%</b>
            </div>
            <div className="summary-box">
              <span>เข้าเรียนรวม</span>
              <b>{report.counts.PRESENT}</b>
            </div>
            <div className="summary-box">
              <span>มาสายรวม</span>
              <b className="yellow">{report.counts.LATE}</b>
            </div>
            <div className="summary-box">
              <span>ขาดเรียนรวม</span>
              <b className="red">{report.counts.ABSENT}</b>
            </div>
            <div className="summary-box">
              <span>ลารวม</span>
              <b>{report.counts.LEAVE}</b>
            </div>
          </section>
          <article className="panel">
            <div className="panel-head">
              <div>
                <h3>
                  แนวโน้มการเข้าเรียน —{" "}
                  {modes.find((item) => item.value === mode)?.label}
                </h3>
                <span className="muted">
                  อัตราเข้าเรียนคำนวณจากเข้าเรียนและมาสาย
                </span>
              </div>
              <div className="export-actions">
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => void exportExcel()}
                  disabled={Boolean(exporting) || !report.trend.length}
                >
                  {exporting === "xlsx" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <FileSpreadsheet size={16} />
                  )}
                  ส่งออก Excel
                </button>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => void exportPdf()}
                  disabled={Boolean(exporting) || !report.trend.length}
                >
                  {exporting === "pdf" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Download size={16} />
                  )}
                  ส่งออก PDF
                </button>
              </div>
            </div>
            {report.trend.length ? (
              <AttendanceChart data={report.trend} />
            ) : (
              <div className="empty">
                <h3>ไม่มีข้อมูลในช่วงเวลานี้</h3>
                <p>ลองเปลี่ยนรายวิชาหรือช่วงวันที่</p>
              </div>
            )}
          </article>
        </div>
      ) : null}
    </>
  );
}
