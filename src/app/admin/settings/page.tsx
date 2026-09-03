import { PageIntro } from "@/components/admin/AdminPage";
import { SettingsForm } from "@/components/admin/SettingsForm";
export default function SettingsPage() {
  return (
    <main className="admin-content">
      <PageIntro
        title="การตั้งค่าระบบ"
        description="กำหนดค่าพื้นฐานและการทำงานของระบบ"
        action="ดูบันทึกระบบ"
      />
      <SettingsForm />
    </main>
  );
}
