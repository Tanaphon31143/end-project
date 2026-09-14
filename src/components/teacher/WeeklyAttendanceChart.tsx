import { BarChart3 } from "lucide-react";
import { AttendanceChart, type AttendanceChartPoint } from "./AttendanceChart";
import { EmptyState } from "./EmptyState";

export function WeeklyAttendanceChart({ data }: { data?: AttendanceChartPoint[] | null }) {
  const hasData = data?.some((day) => [day.present, day.late, day.absent, day.leave].some((value) => Number.isFinite(value) && (value ?? 0) > 0));
  return (
    <section className="panel dashboard-panel" aria-labelledby="weekly-heading">
      <div className="dashboard-panel-head">
        <div><p className="dashboard-eyebrow">แนวโน้มการเข้าเรียน</p><h3 id="weekly-heading">สถิติการเข้าเรียนรายสัปดาห์</h3><p className="dashboard-panel-subtitle">ย้อนหลัง 6 วันทำการ (ครั้ง)</p></div>
      </div>
      {hasData ? <AttendanceChart data={data ?? []} dashboard /> : <EmptyState icon={BarChart3} title="ยังไม่มีข้อมูลกราฟ" description="สถิติจะปรากฏเมื่อมีการบันทึกการเข้าเรียน" />}
    </section>
  );
}
