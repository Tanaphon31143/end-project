import { ChartNoAxesCombined } from "lucide-react";

type Props = {
  students: number;
  status: {
    present: number;
    late: number;
    absent: number;
    leave: number;
    recorded: number;
  };
};

export function AttendanceOverview({ students, status }: Props) {
  const unchecked = Math.max(0, students - Number(status.recorded || 0));
  const values = [
    { label: "มาเรียน", value: Number(status.present || 0), tone: "present" },
    { label: "มาสาย", value: Number(status.late || 0), tone: "late" },
    { label: "ขาดเรียน", value: Number(status.absent || 0), tone: "absent" },
    { label: "ลา", value: Number(status.leave || 0), tone: "leave" },
    { label: "ยังไม่เช็คชื่อ", value: unchecked, tone: "unchecked" },
  ];
  const base = Math.max(students, values.reduce((sum, item) => sum + item.value, 0), 1);
  let cursor = 0;
  const palette: Record<string, string> = {
    present: "#10b981",
    late: "#f59e0b",
    absent: "#ef4444",
    leave: "#8b5cf6",
    unchecked: "#cbd5e1",
  };
  const stops = values.map((item) => {
    const start = cursor;
    cursor += (item.value / base) * 100;
    return `${palette[item.tone]} ${start}% ${cursor}%`;
  });

  return (
    <section className="dashboard-card attendance-overview-card">
      <div className="dashboard-section-head">
        <div className="dashboard-section-title">
          <span className="section-icon violet"><ChartNoAxesCombined size={18} /></span>
          <div><h2>สถานะการเข้าเรียนวันนี้</h2><p>สรุปจากข้อมูลเช็คชื่อวันนี้</p></div>
        </div>
      </div>
      <div className="attendance-overview-body">
        <div className="attendance-donut" style={{ background: `conic-gradient(${stops.join(",")})` }}>
          <div><span>นักเรียนทั้งหมด</span><strong>{students.toLocaleString("th-TH")}</strong><small>คน</small></div>
        </div>
        <div className="attendance-legend-list">
          {values.map((item) => (
            <div key={item.label}>
              <span className={`legend-status ${item.tone}`}><i />{item.label}</span>
              <strong>{item.value.toLocaleString("th-TH")} คน</strong>
              <small>{students ? Math.round((item.value / students) * 100) : 0}%</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
