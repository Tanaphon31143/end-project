import "server-only";
import { createHash } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { db } from "./db";

export type ScanFailureReason =
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "LIVENESS_FAILED"
  | "FACE_NOT_MATCHED"
  | "SESSION_EXPIRED"
  | "ALREADY_ATTENDED"
  | "RATE_LIMITED"
  | "PERMISSION_DENIED";

export function hashIp(ip: string | null | undefined): string {
  if (!ip || ip === "unknown") return "anonymous";
  const salt = process.env.AUTH_SECRET || "attendance_salt";
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}

/**
 * Check if a student is temporarily rate limited after 5 failed scan attempts in 10 minutes
 */
export async function checkScanRateLimit(
  userId: number,
  ipHash: string,
): Promise<{ isLimited: boolean; retryAfterSeconds: number; remainingAttempts: number }> {
  const MAX_FAILS = 5;
  const WINDOW_MINUTES = 10;

  const [rows] = await db.execute<
    (RowDataPacket & {
      failedCount: number;
      oldestAttemptSeconds: number | null;
    })[]
  >(
    `SELECT COUNT(*) failedCount,
            TIMESTAMPDIFF(SECOND, MIN(attempted_at), NOW()) oldestAttemptSeconds
     FROM scan_attempts
     WHERE (user_id = ? OR ip_hash = ?)
       AND success = 0
       AND attempted_at >= NOW() - INTERVAL ? MINUTE`,
    [userId, ipHash, WINDOW_MINUTES],
  );

  const count = Number(rows[0]?.failedCount || 0);

  if (count >= MAX_FAILS) {
    const elapsed = Number(rows[0]?.oldestAttemptSeconds || 0);
    const retryAfter = Math.max(10, WINDOW_MINUTES * 60 - elapsed);
    return {
      isLimited: true,
      retryAfterSeconds: retryAfter,
      remainingAttempts: 0,
    };
  }

  return {
    isLimited: false,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, MAX_FAILS - count),
  };
}

/**
 * Record a scan attempt in scan_attempts table
 */
export async function recordScanAttempt(params: {
  userId: number;
  attendanceSessionId?: number | null;
  success: boolean;
  failureReason?: ScanFailureReason | null;
  livenessResult?: string | null;
  matchResult?: string | null;
  confidence?: number | null;
  deviceInfo?: string | null;
  ipHash: string;
}): Promise<number> {
  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO scan_attempts (
      user_id, attendance_session_id, success, failure_reason,
      liveness_result, match_result, confidence, device_info,
      ip_hash, attempted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      params.userId,
      params.attendanceSessionId || null,
      params.success ? 1 : 0,
      params.failureReason || null,
      params.livenessResult || null,
      params.matchResult || null,
      params.confidence !== null && params.confidence !== undefined
        ? params.confidence
        : null,
      params.deviceInfo ? params.deviceInfo.slice(0, 255) : null,
      params.ipHash,
    ],
  );
  return result.insertId;
}
