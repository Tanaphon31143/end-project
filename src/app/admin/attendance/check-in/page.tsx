import { CheckInPanel } from "@/components/admin/CheckInPanel";
import { PageIntro } from "@/components/admin/AdminPage";
export default function CheckInPage() {
  return (
    <main className="admin-content">
      <PageIntro
        title="จุดเช็คชื่อด้วยใบหน้า"
        description="กล้องทางเข้าอาคารเรียน 1 · ห้อง ม.5/1"
        action="เลือกห้องเรียน"
      />
      <CheckInPanel />
    </main>
  );
}
