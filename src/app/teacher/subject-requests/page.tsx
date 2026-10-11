import { getTeacherSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
import { getTeacherSubjectRequests } from "@/lib/subject-requests";
import { SubjectRequestsClient } from "@/components/teacher/SubjectRequestsClient";
import "./requests.css";

export const dynamic = "force-dynamic";
export default async function SubjectRequestsPage() {
  const session = await getTeacherSession();
  if (!session) return null;
  const [requests, classrooms, [settings]] = await Promise.all([
    getTeacherSubjectRequests(session.id),
    prisma.classroom.findMany({
      select: { id: true, name: true, level: true },
      orderBy: { name: "asc" },
    }),
    db.execute<(RowDataPacket & { academicYear: string; semester: number })[]>("SELECT academic_year academicYear,semester FROM school_settings ORDER BY id LIMIT 1"),
  ]);
  const academicYear = settings[0]?.academicYear || "";
  return (
    <SubjectRequestsClient
      initialRequests={requests}
      classrooms={classrooms}
      academicYear={academicYear}
      semester={settings[0]?.semester || 1}
    />
  );
}
