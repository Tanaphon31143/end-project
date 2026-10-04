import "server-only";

import { createHmac } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type LimitRow = RowDataPacket & { attempts: number; windowStartedAt: Date };

const WINDOW_MS = 15 * 60 * 1000;
const ACCOUNT_IP_LIMIT = 5;
const IP_LIMIT = 50;

function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

function bucketHash(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function expectedOrigin(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "");
  return host ? `${protocol}://${host}` : new URL(request.url).origin;
}

export function validateLoginRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim();
  if (contentType !== "application/json")
    return NextResponse.json(
      { message: "รองรับเฉพาะข้อมูล JSON" },
      { status: 415 },
    );
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 16 * 1024)
    return NextResponse.json({ message: "ข้อมูลมีขนาดใหญ่เกินไป" }, { status: 413 });
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  if (fetchSite === "cross-site" || (origin && origin !== expectedOrigin(request)))
    return NextResponse.json(
      { message: "คำขอถูกปฏิเสธเพื่อความปลอดภัย" },
      { status: 403 },
    );
  return null;
}

function buckets(email: string, request: Request) {
  const ip = requestIp(request);
  return [
    { hash: bucketHash(`login:account-ip:${email}:${ip}`), limit: ACCOUNT_IP_LIMIT },
    { hash: bucketHash(`login:ip:${ip}`), limit: IP_LIMIT },
  ];
}

function limitedResponse(row: LimitRow, limit: number, inclusive = false) {
  const elapsed = Date.now() - new Date(row.windowStartedAt).getTime();
  const attempts = Number(row.attempts);
  if (
    elapsed >= WINDOW_MS ||
    (inclusive ? attempts < limit : attempts <= limit)
  )
    return null;
  const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - elapsed) / 1000));
  return NextResponse.json(
    { message: "พยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function consumeLoginAttempt(email: string, request: Request) {
  const [accountBucket, ipBucket] = buckets(email, request);
  const [ipRows] = await db.execute<LimitRow[]>(
    `SELECT attempts, window_started_at windowStartedAt
     FROM auth_login_limits WHERE bucket_hash=? LIMIT 1`,
    [ipBucket.hash],
  );
  if (ipRows[0]) {
    const blocked = limitedResponse(ipRows[0], ipBucket.limit, true);
    if (blocked) return blocked;
  }
  await db.execute(
    `INSERT INTO auth_login_limits (bucket_hash, attempts, window_started_at)
     VALUES (?, 1, NOW(3))
     ON DUPLICATE KEY UPDATE
       attempts=IF(window_started_at<DATE_SUB(NOW(3), INTERVAL 15 MINUTE),1,attempts+1),
       window_started_at=IF(window_started_at<DATE_SUB(NOW(3), INTERVAL 15 MINUTE),NOW(3),window_started_at),
       updated_at=NOW(3)`,
    [accountBucket.hash],
  );
  const [accountRows] = await db.execute<LimitRow[]>(
    `SELECT attempts, window_started_at windowStartedAt
     FROM auth_login_limits WHERE bucket_hash=? LIMIT 1`,
    [accountBucket.hash],
  );
  return accountRows[0]
    ? limitedResponse(accountRows[0], accountBucket.limit)
    : null;
}

export async function recordFailedLogin(email: string, request: Request) {
  const ipBucket = buckets(email, request)[1];
  await db.execute(
    `INSERT INTO auth_login_limits (bucket_hash, attempts, window_started_at)
     VALUES (?, 1, NOW(3))
     ON DUPLICATE KEY UPDATE
       attempts=IF(window_started_at<DATE_SUB(NOW(3), INTERVAL 15 MINUTE),1,attempts+1),
       window_started_at=IF(window_started_at<DATE_SUB(NOW(3), INTERVAL 15 MINUTE),NOW(3),window_started_at),
       updated_at=NOW(3)`,
    [ipBucket.hash],
  );
  await new Promise((resolve) => setTimeout(resolve, 250));
}

export async function clearLoginRateLimit(email: string, request: Request) {
  const accountIp = buckets(email, request)[0];
  await db.execute("DELETE FROM auth_login_limits WHERE bucket_hash=?", [accountIp.hash]);
}
