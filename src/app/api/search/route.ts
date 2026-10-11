import { getSession } from "@/lib/auth";
import { searchPortal } from "@/lib/portal-search";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !["admin", "teacher"].includes(session.role)) return Response.json({ message: "ไม่มีสิทธิ์ใช้งาน" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (q.length > 100) return Response.json({ message: "คำค้นหาต้องไม่เกิน 100 ตัวอักษร" }, { status: 400 });
  try {
    return Response.json({ results: q ? await searchPortal(session, q) : [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ message: "ค้นหาไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  }
}
