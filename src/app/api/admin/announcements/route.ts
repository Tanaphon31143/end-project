import { getAdminSession } from "@/lib/auth";
import { getAnnouncements } from "@/lib/announcements";
import { db } from "@/lib/db";
import { validateLoginRequest } from "@/lib/login-security";
export async function GET() {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  return Response.json({ announcements: await getAnnouncements(false, 100) });
}
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const rejected = validateLoginRequest(request); if (rejected) return rejected;
  try {
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!title || title.length > 180 || !message || message.length > 5000) return Response.json({ message: "หัวข้อต้องมี 1–180 ตัวอักษร และเนื้อหาต้องมี 1–5,000 ตัวอักษร" }, { status: 400 });
    await db.execute("INSERT INTO school_announcements (title,message,created_by_admin_id) VALUES (?,?,?)", [title, message, session.id]);
    return Response.json({ announcements: await getAnnouncements(false, 100) }, { status: 201 });
  } catch { return Response.json({ message: "บันทึกประกาศไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 }); }
}
export async function PATCH(request: Request) {
  if (!(await getAdminSession())) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const rejected = validateLoginRequest(request); if (rejected) return rejected;
  try {
    const body = await request.json();
    if (!Number.isSafeInteger(body?.id) || body.id < 1 || typeof body.published !== "boolean") return Response.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    await db.execute("UPDATE school_announcements SET is_published=? WHERE id=?", [body.published, body.id]);
    return Response.json({ announcements: await getAnnouncements(false, 100) });
  } catch { return Response.json({ message: "เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 }); }
}
