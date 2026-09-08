import Image from "next/image";
import { redirect } from "next/navigation";
import { UserRound, FilePenLine } from "lucide-react";
import { PageTitle } from "@/components/student/UI";
import ProfileActions from "@/components/student/ProfileActions";
import ProfileRequestHistory from "@/components/student/ProfileRequestHistory";
import { getStudentSession } from "@/lib/auth";
import { getStudentIdentity } from "@/lib/student-data";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const student = await getStudentIdentity(session.id);
  if (!student) redirect("/");

  const details = [
    ["ชื่อ-นามสกุล", student.name],
    ["รหัสนักเรียน", student.code],
    ["ระดับชั้น", student.classLevel || "ยังไม่ระบุ"],
    ["ห้อง", student.className],
    ["เลขที่", student.classNumber ? String(student.classNumber) : "ยังไม่ระบุ"],
    ["วันเกิด", student.birthday || "ยังไม่ระบุ"],
    ["อีเมล", student.email],
    ["เบอร์โทรศัพท์", student.phone || "ยังไม่ระบุ"],
    ["ที่อยู่", student.address || "ยังไม่ระบุ"],
  ];

  return (
    <>
      <PageTitle
        eyebrow="บัญชีของฉัน"
        title="ข้อมูลส่วนตัว"
        description="ตรวจสอบ จัดการข้อมูลติดต่อ และยื่นคำร้องขอแก้ไขข้อมูลสำคัญในระบบ"
      />

      <div className="grid profile-grid">
        <section className="card card-pad profile-card">
          <div className="student-profile-photo">
            {student.hasProfileImage ? (
              <Image
                src="/api/student/profile-image"
                alt="รูปนักเรียน"
                width={96}
                height={96}
                sizes="96px"
                unoptimized
              />
            ) : (
              <span>{student.initials}</span>
            )}
          </div>
          <h2>{student.name}</h2>
          <p>{student.code}</p>
          <span>นักเรียน · {student.className}</span>

          <ProfileActions student={student} />
        </section>

        <section className="card card-pad profile-details">
          <div className="section-label">
            <UserRound size={20} />
            <h2>รายละเอียดนักเรียน</h2>
          </div>
          <div className="info-list">
            {details.map(([label, value]) => (
              <div className="info-row" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Requests History Table */}
      <ProfileRequestHistory />
    </>
  );
}
