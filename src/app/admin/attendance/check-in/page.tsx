import { CheckInPanel } from "@/components/admin/CheckInPanel";
import { getCheckInPageData } from "@/lib/admin-data";
import "./check-in.css";
export const dynamic="force-dynamic";
export default async function CheckInPage() {
  const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const data=await getCheckInPageData(date);
  return (
    <main className="admin-content">
      <div className="page-intro"><div><h2>จุดเช็คชื่อด้วยใบหน้า</h2><p>เปิดรอบเรียนและบันทึกการเข้าเรียนด้วย Face Recognition</p></div></div>
      <CheckInPanel initialData={data} initialDate={date}/>
    </main>
  );
}
