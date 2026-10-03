export default function AdminLoading() {
  return (
    <main
      className="admin-content admin-route-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="admin-loading-heading" />
      <div className="stats-row" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="admin-stat-card" key={index}>
            <div className="admin-loading-line short" />
            <div className="admin-loading-line value" />
            <div className="admin-loading-line" />
          </div>
        ))}
      </div>
      <div className="dashboard-upper" aria-hidden="true">
        <div className="dashboard-card admin-loading-panel" />
        <div className="dashboard-card admin-loading-panel" />
      </div>
      <span className="sr-only">กำลังโหลดข้อมูลจากฐานข้อมูล</span>
    </main>
  );
}
