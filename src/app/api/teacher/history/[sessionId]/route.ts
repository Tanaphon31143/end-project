import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-auth";
import { getTeacherSessionDetail } from "@/lib/teacher-data";

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { sessionId } = await params;
  const session = await getTeacherSessionDetail(auth.teacher.id, sessionId);
  if (!session) return NextResponse.json({ message: "ไม่พบรอบเช็คชื่อหรือไม่มีสิทธิ์" }, { status: 404 });
  return NextResponse.json({ session });
}
