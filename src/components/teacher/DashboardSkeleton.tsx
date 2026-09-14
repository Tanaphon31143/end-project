export function DashboardSkeleton() {
  return (
    <div className="dashboard-page dashboard-loading" role="status" aria-label="กำลังโหลดข้อมูลแดชบอร์ด">
      <div className="dashboard-welcome"><div className="dashboard-welcome-copy"><div className="skeleton dashboard-skeleton-label" /><div className="skeleton dashboard-skeleton-heading" /><div className="skeleton dashboard-skeleton-date" /></div><div className="skeleton dashboard-skeleton-button" /></div>
      <div className="stats-grid dashboard-stats">{Array.from({ length: 6 }, (_, index) => <div className="stat-card dashboard-stat-card" key={index}><div className="skeleton dashboard-skeleton-icon" /><div className="dashboard-stat-copy"><div className="skeleton dashboard-skeleton-label" /><div className="skeleton dashboard-skeleton-number" /><div className="skeleton dashboard-skeleton-detail" /></div></div>)}</div>
      <div className="dashboard-grid dashboard-content-grid"><div className="panel dashboard-panel"><div className="skeleton dashboard-skeleton-heading" /><div className="skeleton dashboard-skeleton-session" /><div className="skeleton dashboard-skeleton-session" /></div><div className="panel dashboard-panel"><div className="skeleton dashboard-skeleton-heading" /><div className="skeleton dashboard-skeleton-chart" /></div></div>
      <span className="sr-only">กำลังโหลดข้อมูลแดชบอร์ด</span>
    </div>
  );
}
