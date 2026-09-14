import { getStudentSession } from '@/lib/auth';
import { db } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

export async function GET(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const student = await getStudentSession();
  if (!student) return Response.json({ message: 'กรุณาเข้าสู่ระบบนักเรียน' }, { status: 401 });
  const reportId = Number((await context.params).reportId);
  if (!Number.isSafeInteger(reportId) || reportId < 1) return new Response(null, { status: 404 });
  const [owners] = await db.execute<RowDataPacket[]>('SELECT id FROM attendance_issue_reports WHERE id=? AND student_id=?', [reportId, student.id]);
  if (!owners.length) return new Response(null, { status: 404 });
  const query = new URL(request.url).searchParams;
  const id = query.get('id');
  if (!id) {
    const [items] = await db.execute<RowDataPacket[]>('SELECT id,file_name name FROM attendance_issue_attachments WHERE report_id=? ORDER BY id', [reportId]);
    const [legacy] = await db.execute<RowDataPacket[]>('SELECT id FROM attendance_issue_reports WHERE id=? AND attachment_data IS NOT NULL', [reportId]);
    return Response.json({ attachments: [...items, ...legacy.map(() => ({ id: 'legacy', name: 'รูปแนบเดิม' }))] }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (id !== 'legacy' && (!Number.isSafeInteger(Number(id)) || Number(id) < 1)) return new Response(null, { status: 404 });
  const [files] = id === 'legacy'
    ? await db.execute<RowDataPacket[]>('SELECT attachment_data data,attachment_mime mime FROM attendance_issue_reports WHERE id=? AND student_id=?', [reportId, student.id])
    : await db.execute<RowDataPacket[]>('SELECT image_data data,image_mime mime FROM attendance_issue_attachments WHERE id=? AND report_id=?', [Number(id), reportId]);
  const file = files[0];
  if (!file?.data || !['image/jpeg','image/png','image/webp'].includes(file.mime)) return new Response(null, { status: 404 });
  const extension = file.mime === 'image/jpeg' ? 'jpg' : file.mime === 'image/png' ? 'png' : 'webp';
  return new Response(new Uint8Array(file.data), { headers: {
    'Content-Type': file.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `${query.get('download') === '1' ? 'attachment' : 'inline'}; filename="report-${reportId}-${id}.${extension}"`,
  } });
}
