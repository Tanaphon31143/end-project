export function DashboardSkeleton() {
  return (
    <div className="dashboard-page dashboard-loading" role="status" aria-label="กำลังโหลดข้อมูลแดชบอร์ด">
      <div className="skeleton dashboard-hero-skeleton" />
      <div className="stats-grid dashboard-stats">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="dashboard-stat-card" key={index}>
            <div className="skeleton dashboard-skeleton-icon" />
            <div>
              <div className="skeleton dashboard-skeleton-label" />
              <div className="skeleton dashboard-skeleton-number" />
              <div className="skeleton dashboard-skeleton-detail" />
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid dashboard-content-grid">
        <div className="panel dashboard-panel"><div className="skeleton dashboard-skeleton-heading" /><div className="skeleton dashboard-skeleton-table" /></div>
        <div className="panel dashboard-panel"><div className="skeleton dashboard-skeleton-heading" /><div className="skeleton dashboard-skeleton-chart" /></div>
      </div>
      <span className="sr-only">กำลังโหลดข้อมูลแดชบอร์ด</span>
    </div>
  );
}
