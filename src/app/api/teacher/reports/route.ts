import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const query = new URL(request.url).searchParams;
  const from = query.get("from")
    ? new Date(`${query.get("from")}T00:00:00.000Z`)
    : new Date(Date.now() - 30 * 86400000);
  const to = query.get("to")
    ? new Date(`${query.get("to")}T23:59:59.999Z`)
    : new Date();
  const subjectId = query.get("subjectId") ?? query.get("courseId");
  const records = await prisma.attendanceRecord.findMany({
    where: {
      attendanceDate: { gte: from, lte: to },
      subject: {
        teacherId: auth.teacher.id,
        ...(subjectId ? { id: Number(subjectId) } : {}),
      },
    },
    select: { status: true },
  });
  const counts: Record<string, number> = {
    PRESENT: 0,
    LATE: 0,
    ABSENT: 0,
    LEAVE: 0,
  };
  for (const record of records) counts[record.status] += 1;
  const total = records.length;
  return NextResponse.json({
    from,
    to,
    total,
    attendanceRate: total
      ? Math.round((counts.PRESENT / total) * 1000) / 10
      : 0,
    counts,
  });
}
