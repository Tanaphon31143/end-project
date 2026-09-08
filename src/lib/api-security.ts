import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const globalBuckets = globalThis as typeof globalThis & { teacherRateLimits?: Map<string, Bucket> };
const buckets = globalBuckets.teacherRateLimits ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") globalBuckets.teacherRateLimits = buckets;

export function protectTeacherMutation(request: Request, teacherId: number, action: string, limit = 30, windowMs = 60_000) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && host && origin !== `${protocol}://${host}`) || (fetchSite && !["same-origin", "none"].includes(fetchSite)))
    return NextResponse.json({ message: "คำขอถูกปฏิเสธเพื่อความปลอดภัย กรุณารีเฟรชหน้าแล้วลองใหม่" }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${teacherId}:${ip}:${action}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else {
    current.count += 1;
    if (current.count > limit) return NextResponse.json({ message: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" }, { status: 429, headers: { "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)) } });
  }
  return null;
}
