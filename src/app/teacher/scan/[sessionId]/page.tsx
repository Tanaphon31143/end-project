import { LiveScanFeed } from "@/components/teacher/LiveScanFeed";
export default async function ScanPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <>
      <div className="page-head">
        <div>
          <h2>เช็คชื่อด้วยใบหน้า</h2>
          <p>รอบเช็คชื่อ #{sessionId} · เปิดใช้งาน 10:20–12:00 น.</p>
        </div>
        <button className="button danger">ปิดรอบเช็คชื่อ</button>
      </div>
      <LiveScanFeed />
    </>
  );
}
