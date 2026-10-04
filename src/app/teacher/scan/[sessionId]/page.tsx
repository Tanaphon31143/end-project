import { LiveScanFeed } from "@/components/teacher/LiveScanFeed";
import "./live-scan.css";
export default async function ScanPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveScanFeed sessionId={sessionId} />;
}
