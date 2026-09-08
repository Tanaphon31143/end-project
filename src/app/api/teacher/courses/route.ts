import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-auth";
import { getTeacherCourses } from "@/lib/teacher-data";
export async function GET() {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  return NextResponse.json({
    courses: await getTeacherCourses(auth.teacher.id),
  });
}
