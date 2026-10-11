"use client";
import DateTimeInput from "@/components/forms/DateTimeInput";
import { useRef, useState } from "react";
import { Download, FileText, CalendarDays, School, BookOpen, CheckCircle2, ChartColumn, Clock, X, UserCheck, UserMinus, UserX, Users } from "lucide-react";
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
  const previewRef = useRef<HTMLDialogElement>(null);
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [includeDetails, setIncludeDetails] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const pageSize = 15;
  const pageCount = Math.max(1, Math.ceil(data.records.length / pageSize));
  const currentPage = Math.min(previewPage, pageCount);
  const previewRecords = data.records.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  async function load() {
    setBusy(true);
    setError("");
    try {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const r = await fetch(`/api/admin/reports?${q}`);
    if (!r.ok) throw new Error("โหลดรายงานไม่สำเร็จ กรุณาลองใหม่");
    setData(await r.json());
    setAppliedFilters({ ...filters });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "โหลดรายงานไม่สำเร็จ");
    } finally { setBusy(false); }
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
    setExporting(true);
    setError("");
    try {
    await document.fonts.ready;
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const doc = new jsPDF(orientation, "mm", "a4");
    const w = doc.internal.pageSize.getWidth() - 20;
    const pageHeight = doc.internal.pageSize.getHeight() - 28;
    // Render each physical page independently, preserving complete table rows.
    const page = reportRef.current.cloneNode(true) as HTMLDivElement;
    page.classList.add("report-export-page");
    Object.assign(page.style, { position: "absolute", left: "-10000px", top: "0", width: `${w * 96 / 25.4}px`, minWidth: "0" });
    document.body.appendChild(page);
    try {
      const table = page.querySelector("table");
      const tbody = table?.querySelector("tbody");
      // Build the complete export from real records, independent of preview pagination.
      const rows = (table ? data.records : []).map((record) => {
        const row = document.createElement("tr");
        for (const value of [record.date, record.studentCode, record.studentName, record.className, `${record.subjectCode} ${record.subjectName}`, record.time, labels[record.status]]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        }
        return row;
      });
      tbody?.replaceChildren();
      const overview = Array.from(page.children).filter((child) => child !== table);
      const maxHeight = pageHeight * 96 / 25.4;
      let pageNumber = 0;
      async function renderPage() {
        if (pageNumber > 0) doc.addPage();
        const canvas = await html2canvas(page, { scale: 2, backgroundColor: "#ffffff", windowWidth: 1400 });
        doc.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, w, canvas.height * w / canvas.width);
        pageNumber++;
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(String(pageNumber), doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
      }
      if (table && tbody && page.offsetHeight > maxHeight) {
        table.remove();
        await renderPage();
        overview.forEach((child) => child.remove());
        page.appendChild(table);
      }
      for (const row of table && tbody ? rows : []) {
        if (!tbody) break;
        tbody.appendChild(row);
        if (page.offsetHeight > maxHeight && tbody.rows.length > 1) {
          row.remove();
          await renderPage();
          overview.forEach((child) => child.remove());
          tbody.replaceChildren(row);
        } else if (page.offsetHeight > maxHeight && tbody.rows.length === 1 && overview.some((child) => child.parentElement === page)) {
          row.remove();
          await renderPage();
          overview.forEach((child) => child.remove());
          tbody.appendChild(row);
        }
      }
      await renderPage();
    } finally { page.remove(); }
    doc.save("attendance-report.pdf");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ส่งออก PDF ไม่สำเร็จ กรุณาลองใหม่");
    } finally { setExporting(false); }
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
          <button className="admin-button primary" disabled={busy} onClick={() => previewRef.current?.showModal()}>
            <Download size={17} />
            Export PDF
          </button>
        </div>
      </div>
      <div className="admin-filters report-filters">
        <DateTimeInput
          aria-label="วันที่เริ่มต้น"
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <DateTimeInput
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
      {error && <p role="alert" className="report-export-error">{error}</p>}
      <div>
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
      <dialog ref={previewRef} className="report-preview-dialog" onCancel={(event) => { if (exporting) event.preventDefault(); }}>
        <header className="report-preview-header">
          <span className="report-preview-icon"><FileText size={28} /></span>
          <div><h2>ตัวอย่างรายงานก่อนส่งออก</h2><p>ตรวจสอบข้อมูลรายงานปัจจุบันก่อนบันทึกเป็นไฟล์ PDF</p></div>
          <button type="button" aria-label="ปิดตัวอย่างรายงาน" disabled={exporting} onClick={() => previewRef.current?.close()}><X size={22} /></button>
        </header>
        <div className="report-preview-body">
          <aside className="report-preview-info">
            <h3><FileText size={18} />ข้อมูลของรายงาน</h3>
            <dl><div><dt><CalendarDays size={16} />ช่วงวันที่</dt><dd>{appliedFilters.from || "ไม่จำกัดวันเริ่มต้น"} – {appliedFilters.to || "ไม่จำกัดวันสิ้นสุด"}</dd></div><div><dt><School size={16} />ชั้นเรียน / ห้อง</dt><dd>{data.classrooms.find((item) => String(item.id) === appliedFilters.classroomId)?.name || "ทุกชั้นเรียน"}</dd></div><div><dt><BookOpen size={16} />รายวิชา</dt><dd>{data.subjects.find((item) => String(item.id) === appliedFilters.subjectId)?.name || "ทุกรายวิชา"}</dd></div></dl>
            <h3><CheckCircle2 size={18} />เนื้อหาในไฟล์ PDF</h3><ul className="report-content-checklist">{["ช่วงวันที่และตัวกรองของรายงาน", "จำนวนนักเรียนและรายการทั้งหมด", "มาเรียน / มาสาย / ขาดเรียน / ลา", "อัตราเข้าเรียนและสัดส่วนแต่ละสถานะ", "กราฟสถิติการเข้าเรียนรายวัน"].map((item) => <li key={item}><CheckCircle2 size={16} /><span>{item}</span></li>)}</ul>
            <label className="report-detail-option"><input type="checkbox" checked={includeDetails} disabled={exporting} onChange={(event) => { setIncludeDetails(event.target.checked); setPreviewPage(1); }} /><span>แนบตารางรายละเอียดทั้งหมด ({data.records.length.toLocaleString("th-TH")} รายการ)</span></label>
            <p className="report-detail-hint">เริ่มต้นเป็นรายงานสรุปเพื่ออ่านและส่งออกได้เร็วขึ้น เลือกแนบรายละเอียดเมื่อต้องการข้อมูลรายบุคคล</p>
            <label className="report-orientation">แนวกระดาษ A4<select value={orientation} disabled={exporting} onChange={(event) => setOrientation(event.target.value as "portrait" | "landscape")}><option value="landscape">แนวนอน</option><option value="portrait">แนวตั้ง</option></select></label>
          </aside>
          <section className="report-preview-document"><div ref={reportRef} className="report-pdf-content">
            <h2>รายงานการเข้าเรียน</h2>
            <p>ช่วงวันที่: {appliedFilters.from || "ทั้งหมด"} – {appliedFilters.to || "ทั้งหมด"} · ห้อง: {data.classrooms.find((item) => String(item.id) === appliedFilters.classroomId)?.name || "ทุกชั้นเรียน"} · วิชา: {data.subjects.find((item) => String(item.id) === appliedFilters.subjectId)?.name || "ทุกรายวิชา"}</p>
            <div className="report-preview-summary">{([ ["นักเรียนในระบบ", data.summary.students, Users], ["รายการทั้งหมด", data.summary.total, FileText], ["มาเรียน", data.summary.present, UserCheck], ["มาสาย", data.summary.late, Clock], ["ขาดเรียน", data.summary.absent, UserX], ["ลา", data.summary.leave, UserMinus] ] as const).map(([label, value, Icon]) => <div key={label}><Icon size={18} /><span>{label}</span><strong>{value.toLocaleString("th-TH")}</strong></div>)}</div>
            <div className="report-preview-rate"><CheckCircle2 size={18} />อัตราเข้าเรียน (มาเรียนและมาสาย) <strong>{data.summary.rate.toFixed(2)}%</strong></div>
            <h3><ChartColumn size={18} />สถิติการเข้าเรียนรายวัน</h3>
            <div className="report-preview-daily">{data.daily.map((day, index) => <div key={`${day.day}-${index}`}><span>{day.day}</span><div className="report-preview-bar"><i style={{ width: `${data.daily.length ? day.students / Math.max(1, ...data.daily.map((item) => item.students)) * 100 : 0}%` }} /></div><b>{day.students} คน</b><small>{day.rate.toFixed(2)}%</small></div>)}{!data.daily.length && <p>ไม่มีข้อมูลรายวันในช่วงที่เลือก</p>}</div>
            <h3><Users size={18} />สัดส่วนการเข้าเรียน</h3>
            <div className="report-preview-distribution">{([ ["PRESENT", data.summary.present], ["LATE", data.summary.late], ["ABSENT", data.summary.absent], ["LEAVE", data.summary.leave] ] as const).map(([status, count]) => <div key={status}><span>{labels[status]}</span><strong>{count.toLocaleString("th-TH")} รายการ</strong><span>{pct(count, data.summary.total).toFixed(2)}%</span></div>)}</div>
            {includeDetails && <><h3>รายละเอียดการเข้าเรียน ({data.records.length.toLocaleString("th-TH")} รายการ)</h3>
            <table className="report-preview-table"><thead><tr>{["วันที่", "รหัสนักเรียน", "ชื่อ–สกุล", "ชั้นเรียน", "รายวิชา", "เวลา", "สถานะ"].map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{previewRecords.map((record, index) => <tr key={index}><td>{record.date}</td><td>{record.studentCode}</td><td>{record.studentName}</td><td>{record.className}</td><td>{record.subjectCode} {record.subjectName}</td><td>{record.time}</td><td>{labels[record.status]}</td></tr>)}{!data.records.length && <tr><td colSpan={7}>ไม่พบข้อมูลการเข้าเรียนในช่วงที่เลือก</td></tr>}</tbody></table></>}
          </div>{includeDetails && <nav className="report-preview-pagination" aria-label="หน้าตารางตัวอย่าง"><span>หน้า {currentPage} / {pageCount} · แสดงไม่เกิน {pageSize} รายการต่อหน้า · PDF แนบครบทุกรายการ</span><button className="admin-button secondary" disabled={currentPage === 1 || exporting} onClick={() => setPreviewPage(currentPage - 1)}>ก่อนหน้า</button><button className="admin-button secondary" disabled={currentPage === pageCount || exporting} onClick={() => setPreviewPage(currentPage + 1)}>ถัดไป</button></nav>}</section>
        </div>
        {error && <p role="alert" className="report-export-error">{error}</p>}
        <footer className="report-preview-footer"><span>{includeDetails ? "รายงานสรุปพร้อมรายละเอียดทั้งหมด" : "รายงานสรุป ไม่แนบตารางรายบุคคล"} · {data.records.length.toLocaleString("th-TH")} รายการ</span><button className="admin-button secondary" disabled={exporting} onClick={() => previewRef.current?.close()}>ยกเลิก</button><button className="admin-button primary" disabled={exporting} onClick={() => void pdf()}><Download size={17} />{exporting ? "กำลังสร้าง PDF…" : "ยืนยัน Export PDF"}</button></footer>
      </dialog>
    </main>
  );
}
const labels = { PRESENT: "มาเรียน", LATE: "สาย", ABSENT: "ขาด", LEAVE: "ลา" };
const pct = (n: number, t: number) => (t ? (100 * n) / t : 0);
