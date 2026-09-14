import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getStudentSession } from '@/lib/auth';
import { buildGoogleAuthUrl } from '@/lib/google-auth';
import { beginStudentFaceIdentity } from '@/lib/student-face-identity';
import { db } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) return Response.json({ message: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ message: 'คำขอไม่ถูกต้อง' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.consent !== true) return Response.json({ message: 'กรุณายินยอมก่อนดำเนินการ' }, { status: 400 });
  const [faceState] = await db.execute<(RowDataPacket & { status: string })[]>(
    'SELECT status FROM face_data WHERE student_id=? LIMIT 1', [session.id]);
  if (faceState[0]?.status === 'INACTIVE')
    return Response.json({ message: 'ข้อมูลใบหน้าถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบก่อนลงทะเบียนใหม่' }, { status: 403 });
  const [attempts] = await db.execute<(RowDataPacket & { count: number })[]>(
    'SELECT COUNT(*) count FROM student_face_identity_verifications WHERE student_id=? AND created_at>=NOW(3)-INTERVAL 30 MINUTE',
    [session.id]);
  if (Number(attempts[0]?.count || 0) >= 5)
    return Response.json({ message: 'ยืนยันบัญชีหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง' }, { status: 429 });
  const state = randomBytes(32).toString('base64url');
  let redirectUrl: string;
  try {
    redirectUrl = buildGoogleAuthUrl(state, request.url);
  } catch (error) {
    console.error('Google OAuth configuration is unavailable for student face verification', error);
    return Response.json({ message: 'Google OAuth ยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ' }, { status: 503 });
  }
  const id = await beginStudentFaceIdentity(session, request);
  if (!id) return Response.json({ message: 'ข้อมูลบัญชีนักเรียนไม่ตรงกันหรือไม่พร้อมใช้งาน' }, { status: 403 });
  const response = NextResponse.json({ redirectUrl }, { headers: { 'Cache-Control': 'no-store' } });
  for (const [name, value] of [['google_oauth_state', state], ['student_face_identity_pending', id]]) {
    response.cookies.set(name, value, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 });
  }
  return response;
}
