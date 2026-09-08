import { LiveScanFeed } from "@/components/teacher/LiveScanFeed";
export default async function ScanPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LiveScanFeed sessionId={sessionId} />;
}
