import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-auth";
import { getTeacherHistory } from "@/lib/teacher-data";

export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const query = new URL(request.url).searchParams;
  const subjectId = Number(query.get("subjectId")) || undefined;
  const result = await getTeacherHistory(auth.teacher.id, {
    subjectId,
    from: query.get("from") ?? undefined,
    to: query.get("to") ?? undefined,
    search: query.get("search") ?? undefined,
    page: Number(query.get("page")) || 1,
    pageSize: Number(query.get("pageSize")) || 20,
  });
  return NextResponse.json(result);
}
