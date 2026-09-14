import { getStudentSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { issueFaceEnrollmentChallenge } from '@/lib/student-face-enrollment';
import { getVerifiedFaceIdentity, studentIdentityRecord } from '@/lib/student-face-identity';
import type { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student) return Response.json({ message: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ message: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  if (!await studentIdentityRecord(student))
    return Response.json({ message: 'บัญชีนักเรียนไม่พร้อมใช้งานหรือข้อมูลไม่ตรงกัน' }, { status: 403 });
  const identity = await getVerifiedFaceIdentity(student.id);
  if (!identity) return Response.json({ message: 'กรุณายืนยันบัญชี Google ก่อนตรวจบุคคลจริง' }, { status: 403 });
  const [rows] = await db.execute<RowDataPacket[]>("SELECT fd.status FROM students s LEFT JOIN face_data fd ON fd.student_id=s.id WHERE s.id=? AND s.status='ACTIVE' LIMIT 1", [student.id]);
  if (!rows[0]) return Response.json({ message: 'ไม่พบบัญชีนักเรียนที่ใช้งาน' }, { status: 403 });
  const challenge = await issueFaceEnrollmentChallenge(student.id);
  if (!challenge) return Response.json({ message: 'ลองลงทะเบียนหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง' }, { status: 429 });
  return Response.json(challenge, { headers: { 'Cache-Control': 'no-store' } });
}
