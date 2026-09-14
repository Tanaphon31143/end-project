import type { ResultSetHeader } from 'mysql2/promise';
import { getStudentSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { consumeFaceEnrollmentChallenge } from '@/lib/student-face-enrollment';
import { getVerifiedFaceIdentity, recordStudentFaceAudit, studentIdentityRecord } from '@/lib/student-face-identity';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student) return Response.json({ message: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ message: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  if (Number(request.headers.get('content-length') || 0) > 16_000)
    return Response.json({ message: 'ข้อมูลการตรวจบุคคลจริงไม่ถูกต้อง' }, { status: 413 });
  if (!await studentIdentityRecord(student))
    return Response.json({ message: 'บัญชีนักเรียนไม่พร้อมใช้งานหรือข้อมูลไม่ตรงกัน' }, { status: 403 });
  const identity = await getVerifiedFaceIdentity(student.id);
  if (!identity) return Response.json({ message: 'การยืนยันบัญชีหมดอายุ กรุณาเริ่มใหม่' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const valid = await consumeFaceEnrollmentChallenge(student.id, body?.token, body?.evidence);
  if (!valid) {
    await recordStudentFaceAudit(student.id, 'LIVENESS_FAILED', identity.id, request);
    return Response.json({ message: 'ไม่สามารถยืนยันว่าเป็นบุคคลจริง กรุณาลองใหม่อีกครั้ง' }, { status: 422 });
  }
  const [result] = await db.execute<ResultSetHeader>(
    `UPDATE student_face_identity_verifications SET liveness_verified_at=NOW(3)
     WHERE id=? AND student_id=? AND status='VERIFIED' AND expires_at>NOW(3) AND used_at IS NULL`,
    [identity.id, student.id]);
  if (result.affectedRows !== 1) return Response.json({ message: 'การยืนยันบัญชีหมดอายุ' }, { status: 409 });
  await recordStudentFaceAudit(student.id, 'LIVENESS_SUCCESS', identity.id, request);
  return Response.json({ verified: true }, { headers: { 'Cache-Control': 'no-store' } });
}
