import { NextResponse } from "next/server";
import { requireTeacher } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const query = new URL(request.url).searchParams;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if ((query.get("from") && !datePattern.test(query.get("from")!)) || (query.get("to") && !datePattern.test(query.get("to")!)))
    return NextResponse.json({ message: "ช่วงวันที่ไม่ถูกต้อง" }, { status: 400 });
  const from = query.get("from")
    ? new Date(`${query.get("from")}T00:00:00.000Z`)
    : new Date(Date.now() - 30 * 86400000);
  const to = query.get("to")
    ? new Date(`${query.get("to")}T23:59:59.999Z`)
    : new Date();
  const subjectId = query.get("subjectId") ?? query.get("courseId");
  const mode = ["daily", "weekly", "monthly"].includes(query.get("mode") ?? "") ? String(query.get("mode")) : "weekly";
  if (subjectId && (!Number.isInteger(Number(subjectId)) || Number(subjectId) < 1))
    return NextResponse.json({ message: "รายวิชาไม่ถูกต้อง" }, { status: 400 });
  if (from > to) return NextResponse.json({ message: "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด" }, { status: 400 });
  const records = await prisma.attendanceRecord.findMany({
    where: {
      attendanceDate: { gte: from, lte: to },
      subject: {
        teacherId: auth.teacher.id,
        ...(subjectId ? { id: Number(subjectId) } : {}),
      },
    },
    select: { status: true, attendanceDate: true },
  });
  const counts: Record<string, number> = {
    PRESENT: 0,
    LATE: 0,
    ABSENT: 0,
    LEAVE: 0,
  };
  for (const record of records) counts[record.status] += 1;
  const total = records.length;
  function groupKey(date: Date) {
    const value = new Date(date);
    if (mode === "monthly") return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
    if (mode === "weekly") {
      const weekday = value.getUTCDay() || 7;
      value.setUTCDate(value.getUTCDate() - weekday + 1);
    }
    return value.toISOString().slice(0, 10);
  }
  const grouped = new Map<string, Record<string, number>>();
  for (const record of records) {
    const key = groupKey(record.attendanceDate);
    const item = grouped.get(key) ?? { PRESENT: 0, LATE: 0, ABSENT: 0, LEAVE: 0 };
    item[record.status] += 1;
    grouped.set(key, item);
  }
  const trend = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => {
    const count = item.PRESENT + item.LATE + item.ABSENT + item.LEAVE;
    const date = new Date(`${key}${mode === "monthly" ? "-01" : ""}T00:00:00.000Z`);
    const label = mode === "monthly"
      ? new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date)
      : mode === "weekly"
        ? `สัปดาห์ ${new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" }).format(date)}`
        : new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
    return { day: label, present: item.PRESENT, late: item.LATE, absent: item.ABSENT, leave: item.LEAVE, total: count, attendanceRate: count ? Math.round(((item.PRESENT + item.LATE) / count) * 1000) / 10 : 0 };
  });
  return NextResponse.json({
    from,
    to,
    mode,
    total,
    attendanceRate: total
      ? Math.round(((counts.PRESENT + counts.LATE) / total) * 1000) / 10
      : 0,
    counts,
    trend,
  });
}
