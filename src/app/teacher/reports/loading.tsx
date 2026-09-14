import "./reports.css";

export default function Loading() {
  return (
    <div className="teacher-reports" role="status" aria-label="กำลังเตรียมรายงานการเข้าเรียน">
      <div className="reports-heading"><div className="skeleton reports-skeleton-title" /><div className="skeleton reports-skeleton-subtitle" /></div>
      <div className="skeleton reports-skeleton-tabs" />
      <div className="panel reports-filter-panel"><div className="reports-filter-grid">{Array.from({ length: 4 }, (_, index) => <div className="skeleton reports-skeleton-field" key={index} />)}</div></div>
      <div className="reports-summary-grid">{Array.from({ length: 5 }, (_, index) => <div className="panel reports-stat-card" key={index}><div className="skeleton reports-skeleton-label" /><div className="skeleton reports-skeleton-value" /></div>)}</div>
      <div className="panel reports-chart-panel"><div className="skeleton reports-skeleton-title" /><div className="skeleton reports-skeleton-chart" /></div>
      <span className="sr-only">กำลังเตรียมรายงานการเข้าเรียน</span>
    </div>
  );
}
