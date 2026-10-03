import Link from "next/link";
import { ArrowLeft, UsersRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getTeacherSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await getTeacherSession();
  if (!session) redirect("/");

  const courseId = Number((await params).courseId);
  if (!Number.isSafeInteger(courseId) || courseId < 1) notFound();

  const course = await prisma.subject.findFirst({
    where: { id: courseId, teacherId: session.id, isActive: true },
    include: { classroom: { select: { id: true, name: true, level: true } } },
  });
  if (!course?.classroom) notFound();

  const students = await prisma.student.findMany({
    where: { classId: course.classroom.id, status: "ACTIVE" },
    select: { id: true, studentCode: true, fullName: true, classNumber: true },
    orderBy: [{ classNumber: "asc" }, { studentCode: "asc" }],
  });

  return (
    <div className="teacher-course-roster">
      <Link className="teacher-course-roster-back" href="/teacher/courses">
        <ArrowLeft size={16} aria-hidden="true" /> กลับไปรายวิชาของฉัน
      </Link>
      <header className="teacher-course-roster-head">
        <span className="teacher-course-roster-icon" aria-hidden="true"><UsersRound size={23} /></span>
        <div>
          <h2>รายชื่อนักเรียน</h2>
          <p>{course.subjectCode} · {course.subjectName} · {course.classroom.name}</p>
        </div>
        <span>{students.length} คน</span>
      </header>
      <section className="teacher-course-roster-table" aria-label="รายชื่อนักเรียนในรายวิชา">
        {students.length ? (
          <table>
            <thead><tr><th>เลขที่</th><th>รหัสนักเรียน</th><th>ชื่อ-นามสกุล</th></tr></thead>
            <tbody>{students.map((student, index) => (
              <tr key={student.id}>
                <td>{student.classNumber ?? index + 1}</td>
                <td>{student.studentCode}</td>
                <td>{student.fullName}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : (
          <p className="teacher-course-roster-empty">ยังไม่มีนักเรียนที่กำลังใช้งานในห้องเรียนนี้</p>
        )}
      </section>
    </div>
  );
}
