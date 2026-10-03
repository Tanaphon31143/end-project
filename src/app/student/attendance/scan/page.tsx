import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import FaceScanner from "@/components/student/FaceScanner";
import { PageTitle } from "@/components/student/UI";
import { getStudentSession } from "@/lib/auth";
import { getTodaySessionsForStudent } from "@/lib/student-check-in";
import { getStudentIdentity } from "@/lib/student-data";

export const dynamic = "force-dynamic";

export default async function ScanPage({
  searchParams,
}: {
  searchParams?: Promise<{ sessionId?: string }>;
}) {
  const student = await getStudentSession();
  if (!student) redirect("/");

  const resolvedParams = searchParams ? await searchParams : undefined;
  const preferredSessionId = resolvedParams?.sessionId
    ? Number(resolvedParams.sessionId)
    : undefined;

  const [activeSessions, studentIdentity] = await Promise.all([
    getTodaySessionsForStudent(student.id),
    getStudentIdentity(student.id),
  ]);

  return (
    <div className="scan-page">
      <nav className="scan-breadcrumb" aria-label="เส้นทางนำทาง">
        <Link href="/student/attendance/scan">เช็คชื่อเข้าเรียน</Link>
        <ChevronRight aria-hidden="true" />
        <span aria-current="page">สแกนใบหน้า</span>
      </nav>

      <PageTitle
        title="สแกนใบหน้าเพื่อเช็คชื่อ"
        description="เลือกคาบเรียน ตรวจสอบความถูกต้อง และสแกนใบหน้าเพื่อบันทึกเวลาเรียน"
      />

      <FaceScanner
        initialSessions={activeSessions}
        preferredSessionId={preferredSessionId}
        student={studentIdentity ?? undefined}
      />
    </div>
  );
}
