import "server-only";
import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { LIVENESS_CHALLENGES, validateLivenessEvidence } from "@/lib/liveness-rules.mjs";

export type LivenessChallenge = (typeof LIVENESS_CHALLENGES)[number];
export type LivenessEvidence = {
  challenge: LivenessChallenge;
  gestures: string[];
  real: number;
  live: number;
  capturedAt: number;
};

export type LivenessVerification = {
  valid: boolean;
  reason?: string;
  score?: number;
  challengeId?: string;
};

type ChallengeRow = RowDataPacket & {
  challengesJson: string | LivenessChallenge[];
  issuedAt: number;
  expiresAt: number;
  usedAt: Date | null;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return value;
}

function signature(id: string) {
  return createHmac("sha256", secret()).update(`student-liveness:${id}`).digest("base64url");
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueLivenessChallenge(userId: number, sessionId: number) {
  const id = randomUUID();
  const available = [...LIVENESS_CHALLENGES];
  const challenges = [
    available.splice(randomInt(available.length), 1)[0],
    available[randomInt(available.length)],
  ] as LivenessChallenge[];
  const token = `${id}.${signature(id)}`;
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 30_000;

  // Retire any previously issued challenge for this session before issuing a new one.
  await db.execute(
    `UPDATE student_liveness_challenges
     SET used_at = CURRENT_TIMESTAMP(3)
     WHERE user_id = ? AND attendance_session_id = ?
       AND used_at IS NULL AND expires_at >= CURRENT_TIMESTAMP(3)`,
    [userId, sessionId],
  );
  await db.execute(
    `INSERT INTO student_liveness_challenges
      (id, token_hash, user_id, attendance_session_id, challenges_json, expires_at)
     VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(? / 1000))`,
    [id, tokenHash(token), userId, sessionId, JSON.stringify(challenges), expiresAt],
  );
  return { token, challenges, issuedAt, expiresAt };
}

export async function verifyAndConsumeLivenessChallenge(params: {
  token: unknown;
  userId: number;
  sessionId: number;
  evidence: unknown;
}): Promise<LivenessVerification> {
  if (typeof params.token !== "string") return { valid: false, reason: "MISSING_CHALLENGE" };
  const [id, suppliedSignature] = params.token.split(".");
  if (!id || !suppliedSignature) return { valid: false, reason: "INVALID_CHALLENGE" };
  const actual = Buffer.from(suppliedSignature);
  const expectedSignature = Buffer.from(signature(id));
  if (actual.length !== expectedSignature.length || !timingSafeEqual(actual, expectedSignature)) {
    return { valid: false, reason: "INVALID_CHALLENGE" };
  }

  const [rows] = await db.execute<ChallengeRow[]>(
    `SELECT challenges_json challengesJson,
            UNIX_TIMESTAMP(created_at) * 1000 issuedAt,
            UNIX_TIMESTAMP(expires_at) * 1000 expiresAt,
            used_at usedAt
     FROM student_liveness_challenges
     WHERE id = ? AND token_hash = ? AND user_id = ? AND attendance_session_id = ?
     LIMIT 1`,
    [id, tokenHash(params.token), params.userId, params.sessionId],
  );
  const row = rows[0];
  if (!row || row.usedAt) {
    return { valid: false, reason: row?.usedAt ? "CHALLENGE_USED" : "INVALID_CHALLENGE", challengeId: id };
  }

  // Consume before accepting or rejecting evidence. An invalid submission must
  // not leave a signed challenge usable for a second attempt.
  const [consumed] = await db.execute<ResultSetHeader>(
    `UPDATE student_liveness_challenges SET used_at = CURRENT_TIMESTAMP(3)
     WHERE id = ? AND token_hash = ? AND user_id = ? AND attendance_session_id = ?
       AND used_at IS NULL AND expires_at >= CURRENT_TIMESTAMP(3)`,
    [id, tokenHash(params.token), params.userId, params.sessionId],
  );
  if (consumed.affectedRows !== 1) {
    return { valid: false, reason: "CHALLENGE_EXPIRED", challengeId: id };
  }

  let expected: LivenessChallenge[];
  try {
    expected = typeof row.challengesJson === "string"
      ? JSON.parse(row.challengesJson)
      : row.challengesJson;
  } catch {
    return { valid: false, reason: "INVALID_CHALLENGE", challengeId: id };
  }
  const validation = validateLivenessEvidence({
    expected,
    evidence: params.evidence,
    issuedAt: Number(row.issuedAt),
    expiresAt: Number(row.expiresAt),
  });
  return { ...validation, challengeId: id };
}

export async function checkLivenessFailureLimit(userId: number, sessionId: number) {
  const [rows] = await db.execute<(RowDataPacket & { failedCount: number })[]>(
    `SELECT COUNT(*) failedCount FROM scan_attempts
     WHERE user_id = ? AND attendance_session_id = ?
       AND failure_reason = 'LIVENESS_FAILED'
       AND attempted_at >= NOW() - INTERVAL 30 MINUTE`,
    [userId, sessionId],
  );
  const failedCount = Number(rows[0]?.failedCount || 0);
  return { isLimited: failedCount >= 3, remainingAttempts: Math.max(0, 3 - failedCount) };
}
