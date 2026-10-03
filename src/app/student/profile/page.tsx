import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import ProfileActions from "@/components/student/ProfileActions";
import ProfileRequestHistory from "@/components/student/ProfileRequestHistory";
import { ProfileAccountCard, ProfilePageHeading, ProfileSection } from "@/components/profile/ProfilePrimitives";
import { ProfileSummaryCard } from "@/components/profile/ProfileSummaryCard";
import { PasswordChangeCard } from "@/components/profile/PasswordChangeCard";
import { getStudentSession } from "@/lib/auth";
import { getStudentIdentity } from "@/lib/student-data";
import "../../profile.css";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getStudentSession();
  if (!session) redirect("/");
  const student = await getStudentIdentity(session.id);
  if (!student) redirect("/");
  const context = [student.classLevel, student.className].filter(Boolean).join(" · ");

  return <div className="account-profile student-account-profile">
    <ProfilePageHeading />
    <div className="account-profile-layout">
      <ProfileSummaryCard
        name={student.name} role="นักเรียน" code={student.code} context={context || "ยังไม่ระบุ"}
        initials={student.initials} hasProfileImage={student.hasProfileImage}
        imageUrl="/api/student/profile-image" uploadUrl="/api/student/profile"
      />
      <div className="account-profile-main">
        <ProfileSection title="ข้อมูลส่วนตัว" description="ข้อมูลประจำตัวและช่องทางติดต่อ" icon={<UserRound size={20} />}>
          <ProfileActions student={student} />
        </ProfileSection>
        <PasswordChangeCard role="student" />
      </div>
    </div>
    <ProfileAccountCard role="นักเรียน" code={student.code} context={context || "ยังไม่ระบุ"} faceReady={student.faceReady} />
    <div className="account-profile-history"><ProfileRequestHistory /></div>
  </div>;
}
