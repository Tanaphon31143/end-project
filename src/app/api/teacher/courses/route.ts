import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-auth";
import {
  getSchoolTerm,
  parseAcademicTerm,
  type AcademicTerm,
} from "@/lib/academic-term";
import { getTeacherCourses } from "@/lib/teacher-data";
export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const query = new URL(request.url).searchParams;
  const schoolTerm = await getSchoolTerm();
  let term: AcademicTerm;
  try {
    term = parseAcademicTerm(
      {
        academicYear: query.get("academicYear") ?? undefined,
        semester: query.get("semester") ?? undefined,
      },
      schoolTerm,
    );
  } catch {
    return NextResponse.json(
      { message: "ปีการศึกษาหรือภาคเรียนไม่ถูกต้อง" },
      { status: 400 },
    );
  }
  return NextResponse.json({
    courses: await getTeacherCourses(auth.teacher.id, term),
  });
}
