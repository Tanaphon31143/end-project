import { getAdminSession, getTeacherSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";
export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ reportId: string }> }) {
  const admin = await getAdminSession();
  const teacher = admin ? null : await getTeacherSession();
  if (!admin && !teacher) return new Response(null, { status: 401 });
  const reportId = Number((await context.params).reportId);
  if (!Number.isSafeInteger(reportId) || reportId < 1) return new Response(null, { status: 404 });
  const [reports] = await db.execute<RowDataPacket[]>(`SELECT r.id FROM attendance_issue_reports r LEFT JOIN subjects s ON s.id=r.subject_id WHERE r.id=? ${teacher ? "AND s.teacher_id=?" : ""}`, teacher ? [reportId, teacher.id] : [reportId]);
  if (!reports.length) return new Response(null, { status: 404 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    const [items] = await db.execute<RowDataPacket[]>("SELECT id,file_name name FROM attendance_issue_attachments WHERE report_id=? ORDER BY id", [reportId]);
    const [legacy] = await db.execute<RowDataPacket[]>("SELECT id FROM attendance_issue_reports WHERE id=? AND attachment_data IS NOT NULL", [reportId]);
    return Response.json({ attachments: [...items, ...legacy.map(() => ({ id: "legacy", name: "รูปแนบเดิม" }))] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  if (id !== "legacy" && (!Number.isSafeInteger(Number(id)) || Number(id) < 1)) return new Response(null, { status: 404 });
  const [files] = id === "legacy" ? await db.execute<RowDataPacket[]>("SELECT attachment_data data,attachment_mime mime FROM attendance_issue_reports WHERE id=?", [reportId]) : await db.execute<RowDataPacket[]>("SELECT image_data data,image_mime mime FROM attendance_issue_attachments WHERE id=? AND report_id=?", [Number(id), reportId]);
  const file = files[0];
  if (!file?.data || !["image/jpeg", "image/png", "image/webp"].includes(file.mime)) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(file.data), { headers: { "Content-Type": file.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
