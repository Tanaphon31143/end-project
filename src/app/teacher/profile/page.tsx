import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/teacher/ProfileClient";
import { getTeacherSession } from "@/lib/auth";
import { getTeacherIdentity } from "@/lib/teacher-data";

export default async function Profile() {
  const session = await getTeacherSession();
  if (!session) redirect("/");
  const identity = await getTeacherIdentity(session.id);
  if (!identity) redirect("/");
  return <ProfileClient initialTeacher={identity} />;
}
