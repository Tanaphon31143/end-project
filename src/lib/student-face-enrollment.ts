import 'server-only';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import { LIVENESS_CHALLENGES, validateLivenessEvidence } from '@/lib/liveness-rules.mjs';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
type Challenge = (typeof LIVENESS_CHALLENGES)[number];

export async function issueFaceEnrollmentChallenge(studentId: number) {
  const [count] = await db.execute<(RowDataPacket & { attempts: number })[]>(
    'SELECT COUNT(*) attempts FROM student_face_enrollment_challenges WHERE student_id=? AND created_at >= NOW()-INTERVAL 30 MINUTE', [studentId]);
  if (Number(count[0]?.attempts || 0) >= 5) return null;
  await db.execute('UPDATE student_face_enrollment_challenges SET used_at=NOW(3) WHERE student_id=? AND used_at IS NULL', [studentId]);
  const id = randomUUID(), token = `${id}.${randomBytes(32).toString('base64url')}`;
  const available = [...LIVENESS_CHALLENGES];
  const challenges = Array.from({ length: 3 }, () => available.splice(randomInt(available.length), 1)[0]) as Challenge[];
  const issuedAt = Date.now(), expiresAt = issuedAt + 45_000;
  await db.execute('INSERT INTO student_face_enrollment_challenges(id,token_hash,student_id,challenges_json,expires_at) VALUES(?,?,?,?,FROM_UNIXTIME(?/1000))',
    [id, hash(token), studentId, JSON.stringify(challenges), expiresAt]);
  return { token, challenges, issuedAt, expiresAt };
}

export async function consumeFaceEnrollmentChallenge(studentId: number, token: unknown, evidence: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9-]{36}\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const [id] = token.split('.');
  const [rows] = await db.execute<(RowDataPacket & { challengesJson: string | Challenge[]; issuedAt: number; expiresAt: number })[]>(
    `SELECT challenges_json challengesJson, UNIX_TIMESTAMP(created_at)*1000 issuedAt, UNIX_TIMESTAMP(expires_at)*1000 expiresAt
     FROM student_face_enrollment_challenges WHERE id=? AND token_hash=? AND student_id=? AND used_at IS NULL LIMIT 1`,
    [id, hash(token), studentId]);
  if (!rows[0]) return false;
  const [result] = await db.execute<ResultSetHeader>(
    'UPDATE student_face_enrollment_challenges SET used_at=NOW(3) WHERE id=? AND token_hash=? AND student_id=? AND used_at IS NULL AND expires_at>=NOW(3)',
    [id, hash(token), studentId]);
  if (result.affectedRows !== 1) return false;
  let challenges: Challenge[];
  try { challenges = typeof rows[0].challengesJson === 'string' ? JSON.parse(rows[0].challengesJson) : rows[0].challengesJson; }
  catch { return false; }
  return validateLivenessEvidence({ expected: challenges, evidence, issuedAt: Number(rows[0].issuedAt), expiresAt: Number(rows[0].expiresAt) }).valid;
}
