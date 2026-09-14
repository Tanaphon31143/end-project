export default function CoursesLoading() {
  return (
    <div role="status" aria-live="polite">
      <div className="student-skeleton scan-title-skeleton" />
      <div className="course-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="card student-skeleton" style={{ minHeight: 190 }} />
        ))}
      </div>
      <span className="sr-only">กำลังโหลดข้อมูลรายวิชา</span>
    </div>
  );
}
