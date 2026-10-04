"use client";

import DateTimeInput from "@/components/forms/DateTimeInput";
import { useCallback, useEffect, useState } from "react";
import {
  ChartNoAxesCombined,
  Clock3,
  Download,
  FileBarChart,
  FileSpreadsheet,
  LoaderCircle,
  UserCheck,
  UserMinus,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import {
  AttendanceChart,
  type AttendanceChartPoint,
} from "@/components/teacher/AttendanceChart";
import { EmptyState } from "@/components/teacher/EmptyState";

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

const safeCount = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

function ReportStatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: string;
  icon: LucideIcon;
}) {
  return (
    <article className={`reports-stat-card ${tone}`}>
      <div className="reports-stat-icon">
        <Icon size={19} aria-hidden="true" />
      </div>
      <div className="reports-stat-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

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
  const trend = Array.isArray(report?.trend) ? report.trend : [];
  return (
    <div className="teacher-reports">
      <div className="reports-heading">
        <div>
          <p className="reports-eyebrow">ภาพรวมและสถิติ</p>
          <h2>รายงานการเข้าเรียน</h2>
          <p>สรุปข้อมูลเฉพาะรายวิชาที่คุณรับผิดชอบ</p>
        </div>
      </div>
      <div className="tabs reports-tabs" aria-label="รูปแบบรายงาน">
        {modes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setMode(item.value)}
            className={`tab ${mode === item.value ? "active" : ""}`}
            aria-pressed={mode === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section
        className="panel reports-filter-panel"
        aria-label="ตัวกรองรายงาน"
      >
        <form
          className="reports-filter-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void load();
          }}
        >
          <label className="reports-field reports-course-field">
            <span>รายวิชา</span>
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              <option value="">ทุกรายวิชา</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} {course.name}
                </option>
              ))}
            </select>
          </label>
          <label className="reports-field">
            <span>ตั้งแต่วันที่</span>
            <DateTimeInput
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              required
            />
          </label>
          <label className="reports-field">
            <span>ถึงวันที่</span>
            <DateTimeInput
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              required
            />
          </label>
          <button
            className="button primary reports-generate"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <FileBarChart size={17} />
            )}
            {loading ? "กำลังสร้าง" : "สร้างรายงาน"}
          </button>
        </form>
        {error && report && (
          <p className="form-message error" role="alert">
            {error}
          </p>
        )}
      </section>
      {loading && !report ? (
        <div
          className="reports-loading"
          role="status"
          aria-label="กำลังสร้างรายงาน"
        >
          <div className="reports-summary-grid">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="reports-stat-card" key={index}>
                <div className="skeleton reports-skeleton-label" />
                <div className="skeleton reports-skeleton-value" />
              </div>
            ))}
          </div>
          <div className="panel reports-chart-panel">
            <div className="skeleton reports-skeleton-title" />
            <div className="skeleton reports-skeleton-chart" />
          </div>
        </div>
      ) : report ? (
        <div
          id="teacher-report-export"
          className="reports-content"
          aria-busy={loading}
        >
          <section className="reports-summary-grid" aria-label="สรุปรายงาน">
            <ReportStatCard
              label="อัตราการเข้าเรียนเฉลี่ย"
              value={`${safeCount(report.attendanceRate).toFixed(1)}%`}
              tone="rate"
              icon={ChartNoAxesCombined}
            />
            <ReportStatCard
              label="เข้าเรียนรวม"
              value={String(safeCount(report.counts?.PRESENT))}
              tone="present"
              icon={UserRoundCheck}
            />
            <ReportStatCard
              label="มาสายรวม"
              value={String(safeCount(report.counts?.LATE))}
              tone="late"
              icon={Clock3}
            />
            <ReportStatCard
              label="ขาดเรียนรวม"
              value={String(safeCount(report.counts?.ABSENT))}
              tone="absent"
              icon={UserMinus}
            />
            <ReportStatCard
              label="ลารวม"
              value={String(safeCount(report.counts?.LEAVE))}
              tone="leave"
              icon={UserCheck}
            />
          </section>
          <article className="panel reports-chart-panel">
            <div className="reports-chart-head">
              <div>
                <h3>
                  แนวโน้มการเข้าเรียน —{" "}
                  {modes.find((item) => item.value === mode)?.label}
                </h3>
                <p className="muted">อัตราเข้าเรียนคำนวณจากเข้าเรียนและมาสาย</p>
              </div>
              <div className="export-actions">
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => void exportExcel()}
                  disabled={loading || Boolean(exporting) || !trend.length}
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
                  disabled={loading || Boolean(exporting) || !trend.length}
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
            {trend.length ? (
              <AttendanceChart data={trend} dashboard />
            ) : (
              <EmptyState
                title="ไม่มีข้อมูลในช่วงเวลานี้"
                description="ลองเปลี่ยนรายวิชาหรือช่วงวันที่"
              />
            )}
          </article>
        </div>
      ) : error ? (
        <div className="panel reports-error">
          <EmptyState
            title="โหลดรายงานไม่สำเร็จ"
            description="กรุณาลองใหม่อีกครั้ง"
          />
          <button className="button primary" onClick={() => void load()}>
            ลองใหม่
          </button>
        </div>
      ) : null}
    </div>
  );
}
