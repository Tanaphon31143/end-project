export default function StatisticsLoading() {
  return (
    <div className="statistics-skeleton" role="status" aria-label="กำลังโหลดสถิติการเข้าเรียน">
      <div className="statistics-skeleton-row">
        {Array.from({ length: 5 }, (_, index) => <i key={index} />)}
      </div>
      <i />
      <span className="sr-only">กำลังโหลดข้อมูลจากฐานข้อมูล</span>
    </div>
  );
}
