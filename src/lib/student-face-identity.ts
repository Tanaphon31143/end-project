import 'server-only';
import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { db } from '@/lib/db';
import type { AppSession } from '@/lib/auth';

type IdentityRow = RowDataPacket & {
  id: string;
  studentId: number;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'USED';
  email: string;
  studentName: string;
  studentCode: string;
  livenessVerified: number;
  googleSub: string;
  verifiedEmail: string;
};

export async function studentIdentityRecord(session: AppSession) {
  if (session.role !== 'student') return null;
  const [rows] = await db.execute<IdentityRow[]>(
    `SELECT id studentId,email,full_name studentName,student_code studentCode
     FROM students WHERE id=? AND status='ACTIVE' LIMIT 1`, [session.id]);
  const student = rows[0];
  if (!student || !student.email || student.email.trim().toLowerCase() !== session.email?.trim().toLowerCase()) return null;
  return student;
}

export async function beginStudentFaceIdentity(session: AppSession, request?: Request) {
  const student = await studentIdentityRecord(session);
  if (!student) return null;
  const id = randomUUID();
  await db.execute('UPDATE student_face_identity_verifications SET status=\'FAILED\' WHERE student_id=? AND status IN (\'PENDING\',\'VERIFIED\')', [session.id]);
  await db.execute('UPDATE student_face_enrollment_challenges SET used_at=NOW(3) WHERE student_id=? AND used_at IS NULL', [session.id]);
  await db.execute(
    `INSERT INTO student_face_identity_verifications
     (id,student_id,method,status,consented_at,student_data_verified_at,expires_at)
     VALUES(?,?,'GOOGLE','PENDING',NOW(3),NOW(3),NOW(3)+INTERVAL 10 MINUTE)`, [id, session.id]);
  await recordStudentFaceAudit(session.id, 'IDENTITY_VERIFICATION_STARTED', id, request);
  await recordStudentFaceAudit(session.id, 'STUDENT_DATA_VERIFIED', id, request);
  return id;
}

export async function completeStudentFaceIdentity(session: AppSession | null, id: string, googleSub: string, googleEmail: string, verifiedEmail: boolean, request?: Request) {
  if (!session || session.role !== 'student') return { verified: false, reason: 'student' } as const;
  const student = await studentIdentityRecord(session);
  const normalizedEmail = googleEmail.trim().toLowerCase();
  let reason = !student ? 'student' : !verifiedEmail ? 'google-unverified'
    : normalizedEmail !== student.email.trim().toLowerCase() ? 'email-mismatch' : 'failed';
  let valid = Boolean(student && verifiedEmail && normalizedEmail === student.email.trim().toLowerCase()
    && googleSub.length > 0 && googleSub.length <= 255
    && normalizedEmail.length > 3 && normalizedEmail.length <= 255 && normalizedEmail.includes('@'));
  if (valid) {
    const [bindings] = await db.execute<(RowDataPacket & { studentId: number; googleSub: string; verifiedEmail: string })[]>(
      `SELECT student_id studentId,google_sub googleSub,verified_email verifiedEmail
       FROM student_face_email_bindings WHERE student_id=? OR google_sub=? OR verified_email=?`,
      [session.id, googleSub, normalizedEmail]);
    valid = bindings.every(binding => Number(binding.studentId) === session.id
      && binding.googleSub === googleSub && binding.verifiedEmail === normalizedEmail);
    if (!valid) reason = 'bound';
  }
  const [result] = await db.execute<import('mysql2/promise').ResultSetHeader>(
    `UPDATE student_face_identity_verifications
     SET status=?,account_verified_at=IF(?,NOW(3),NULL),google_sub=?,verified_email=?
     WHERE id=? AND student_id=? AND status='PENDING' AND expires_at>NOW(3)`,
    [valid ? 'VERIFIED' : 'FAILED', valid, valid ? googleSub : null, valid ? normalizedEmail : null, id, session.id]);
  if (result.affectedRows !== 1) return { verified: false, reason: 'expired' } as const;
  await recordStudentFaceAudit(session.id, valid ? 'IDENTITY_VERIFICATION_SUCCESS' : 'IDENTITY_VERIFICATION_FAILED', id, request);
  return { verified: valid, reason: valid ? null : reason };
}

export async function failStudentFaceIdentity(session: AppSession | null, id: string, request?: Request) {
  if (!session || session.role !== 'student') return;
  const [result] = await db.execute<import('mysql2/promise').ResultSetHeader>(
    "UPDATE student_face_identity_verifications SET status='FAILED' WHERE id=? AND student_id=? AND status='PENDING'",
    [id, session.id]);
  if (result.affectedRows) await recordStudentFaceAudit(session.id, 'IDENTITY_VERIFICATION_FAILED', id, request);
}

export async function getVerifiedFaceIdentity(studentId: number) {
  const [rows] = await db.execute<IdentityRow[]>(
    `SELECT v.id,v.student_id studentId,v.status,(v.liveness_verified_at IS NOT NULL) livenessVerified,
            v.google_sub googleSub,v.verified_email verifiedEmail
     FROM student_face_identity_verifications v
     JOIN students s ON s.id=v.student_id AND s.status='ACTIVE'
       AND LOWER(TRIM(s.email))=v.verified_email
     WHERE v.student_id=? AND v.status='VERIFIED' AND v.consented_at IS NOT NULL
       AND v.account_verified_at IS NOT NULL AND v.student_data_verified_at IS NOT NULL
       AND v.google_sub IS NOT NULL AND v.verified_email IS NOT NULL
       AND v.expires_at>NOW(3) AND v.used_at IS NULL
     ORDER BY v.created_at DESC LIMIT 1`, [studentId]);
  return rows[0] || null;
}

export async function recordStudentFaceAudit(studentId: number, action: string, entityId?: string, request?: Request) {
  await db.execute(
    `INSERT INTO audit_logs(user_id,action,entity,entity_id,description,ip_address,user_agent)
     VALUES(?,?,'student_face',?,'Student self-enrollment',NULL,?)`,
    [studentId, action, entityId || null, request?.headers.get('user-agent')?.slice(0, 255) || null]);
}
