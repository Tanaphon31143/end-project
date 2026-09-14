import "./scan.css";

export default function Loading() {
  return (
    <div className="teacher-scan-index" role="status" aria-label="กำลังโหลดรอบเช็คชื่อ">
      <div className="scan-index-heading"><div className="skeleton scan-skeleton-heading" /><div className="skeleton scan-skeleton-subtitle" /></div>
      <div className="panel scan-index-panel"><div className="skeleton scan-skeleton-heading" /><div className="skeleton scan-skeleton-row" /><div className="skeleton scan-skeleton-row" /></div>
      <span className="sr-only">กำลังโหลดรอบเช็คชื่อ</span>
    </div>
  );
}
