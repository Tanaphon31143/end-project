import { ArrowDown, ArrowUp, BarChart3, ChevronDown } from "lucide-react";
import { AttendanceChart, type AttendanceChartPoint } from "./AttendanceChart";
import { EmptyState } from "./EmptyState";

export function WeeklyAttendanceChart({
  data,
  students,
  summary,
}: {
  data?: AttendanceChartPoint[] | null;
  students?: number | null;
  summary?: { average?: number | null; change?: number | null } | null;
}) {
  const hasData = data?.some((day) => (day.total ?? 0) > 0);
  const average = Number.isFinite(summary?.average) ? summary?.average ?? 0 : 0;
  const change =
    typeof summary?.change === "number" && Number.isFinite(summary.change)
      ? summary.change
      : null;

  return (
    <section className="panel dashboard-panel dashboard-weekly" aria-labelledby="weekly-heading">
      <div className="dashboard-panel-head">
        <h3 id="weekly-heading">สถิติการเข้าเรียนรายสัปดาห์</h3>
        <label className="dashboard-week-select">
          <span className="sr-only">ช่วงข้อมูล</span>
          <select aria-label="ช่วงข้อมูล" defaultValue="current-week">
            <option value="current-week">สัปดาห์นี้</option>
          </select>
          <ChevronDown size={15} aria-hidden="true" />
        </label>
      </div>
      {hasData ? (
        <>
          <AttendanceChart data={data ?? []} dashboard />
          <div className="dashboard-weekly-summary">
            <div>
              <span>เฉลี่ยทั้งสัปดาห์</span>
              <strong>{average.toFixed(1)}%</strong>
            </div>
            {change !== null && (
              <p className={change >= 0 ? "positive" : "negative"}>
                {change >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                {change >= 0 ? "+" : ""}{change.toFixed(1)}%
              </p>
            )}
            <small>{change === null ? "ยังไม่มีข้อมูลสัปดาห์ก่อน" : "จากสัปดาห์ก่อน"}</small>
            <div className="dashboard-weekly-students">
              <span>นักเรียนทั้งหมด</span>
              <strong>{Number.isFinite(students) ? students : 0} คน</strong>
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={BarChart3} title="ยังไม่มีข้อมูลการเข้าเรียน" description="สถิติจะปรากฏเมื่อมีการบันทึกการเข้าเรียน" />
      )}
    </section>
  );
}
