export default function FaceLoading() {
  return (
    <div role="status" aria-live="polite">
      <div className="student-skeleton scan-title-skeleton" />
      <div className="card student-skeleton face-status" style={{ minHeight: 120 }} />
      <div className="card student-skeleton" style={{ minHeight: 280, marginTop: 18 }} />
      <span className="sr-only">กำลังโหลดข้อมูลใบหน้า</span>
    </div>
  );
}
