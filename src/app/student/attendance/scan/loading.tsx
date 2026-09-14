export default function ScanLoading() {
  return (
    <div className="scan-page-loading" role="status" aria-live="polite">
      <div className="student-skeleton scan-title-skeleton" />
      <div className="grid scan-layout">
        <div className="card student-skeleton scan-camera-skeleton" />
        <div className="grid scan-side">
          <div className="card student-skeleton scan-side-skeleton" />
          <div className="card student-skeleton scan-side-skeleton short" />
        </div>
      </div>
      <span className="sr-only">กำลังโหลดข้อมูลคาบเรียนและระบบสแกนใบหน้า</span>
    </div>
  );
}
