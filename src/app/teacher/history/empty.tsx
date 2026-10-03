import { EmptyState } from "@/components/teacher/EmptyState";

export default function Empty() {
  return (
    <div className="panel">
      <EmptyState
        title="ยังไม่มีประวัติการเช็คชื่อ"
        description="เมื่อปิดรอบเช็คชื่อ รายการจะปรากฏที่หน้านี้"
      />
    </div>
  );
}
