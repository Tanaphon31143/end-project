import { redirect } from "next/navigation";
import { Clock3, DoorOpen, ShieldCheck, UserRound, AlertCircle } from "lucide-react";
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
    <>
      <PageTitle
        eyebrow="เช็คชื่อด้วยใบหน้า"
        title="สแกนใบหน้าเพื่อเช็คชื่อ"
        description="เลือกคาบเรียน ตรวจสอบความถูกต้อง และสแกนใบหน้าเพื่อบันทึกเวลาเรียน"
      />

      <div className="grid scan-layout">
        <section className="card card-pad">
          <FaceScanner
            initialSessions={activeSessions}
            preferredSessionId={preferredSessionId}
            student={studentIdentity ?? undefined}
          />
        </section>

        <aside className="grid scan-side">
          <section className="card class-live">
            <div className="live-label">
              <i />{" "}
              {activeSessions.length > 0
                ? `มี ${activeSessions.length} คาบเรียนวันนี้`
                : "ไม่มีคาบเรียนที่ครูเปิดวันนี้"}
            </div>

            {activeSessions.length > 0 ? (
              <div className="live-summary">
                <span>คาบเรียนวันนี้</span>
                <h2>{activeSessions[0].subjectName}</h2>
                <p>{activeSessions[0].subjectCode}</p>

                <div className="class-facts">
                  <span>
                    <UserRound size={18} />
                    <small>
                      ครูผู้สอน <b>{activeSessions[0].teacherName}</b>
                    </small>
                  </span>
                  <span>
                    <DoorOpen size={18} />
                    <small>
                      ห้องเรียน <b>{activeSessions[0].room}</b>
                    </small>
                  </span>
                  <span>
                    <Clock3 size={18} />
                    <small>
                      เวลาเปิดเช็คชื่อ <b>{activeSessions[0].startTime} น.</b>
                    </small>
                  </span>
                  <span>
                    <Clock3 size={18} />
                    <small>
                      เวลาปิดเช็คชื่อ <b>{activeSessions[0].endTime} น.</b>
                    </small>
                  </span>
                </div>
              </div>
            ) : (
              <div className="no-live-box">
                <AlertCircle size={32} />
                <p>ขณะนี้ยังไม่มีคาบเรียนที่ครูเปิดเช็คชื่อ</p>
                <small>เมื่อครูผู้สอนเปิดรอบเช็คชื่อสำหรับวันนี้ คาบเรียนจะปรากฏที่นี่</small>
              </div>
            )}
          </section>

          <section className="card scan-security">
            <ShieldCheck size={24} />
            <div>
              <strong>มาตรการความปลอดภัยชีวมิติ</strong>
              <p>
                ระบบจำกัดการสแกนผิดพลาดไม่เกิน 5 ครั้ง มีการตรวจสอบบุคคลจริง (Liveness Detection)
                และตรวจสอบสิทธิ์ตามห้องเรียนที่ลงทะเบียนอย่างเข้มงวด
              </p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
