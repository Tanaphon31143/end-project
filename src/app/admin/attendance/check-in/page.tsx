import { CheckInPanel } from "@/components/admin/CheckInPanel";
import { getCheckInPageData } from "@/lib/admin-data";
import { ScanFace } from "lucide-react";
import "./check-in.css";
export const dynamic="force-dynamic";
export default async function CheckInPage() {
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const data=await getCheckInPageData(date);
  return (
    <main className="admin-content checkin-page">
      <div className="checkin-page-heading"><ScanFace size={32} aria-hidden="true" /><div><h1>จุดเช็คชื่อด้วยใบหน้า</h1><p>เลือกรอบเรียน เปิดกล้อง และสแกนเพื่อบันทึกการเข้าเรียน</p></div></div>
      <CheckInPanel initialData={data} initialDate={date}/>
    </main>
  );
}
