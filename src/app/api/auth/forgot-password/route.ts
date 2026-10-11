import { consumeLoginAttempt, recordFailedLogin, validateLoginRequest } from "@/lib/login-security";
import { recoveryConfigured, recoveryMessage, requestPasswordRecovery } from "@/lib/password-recovery";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const rejected = validateLoginRequest(request); if (rejected) return rejected;
  let body;
  try { const raw = await request.text(); if (Buffer.byteLength(raw) > 16384) return Response.json({ message: "ข้อมูลมีขนาดใหญ่เกินไป" }, { status: 413 }); body = JSON.parse(raw); } catch { return Response.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ message: "กรุณากรอกอีเมลให้ถูกต้อง" }, { status: 400 });
  try {
    const key = `recovery:${email}`;
    const limited = await consumeLoginAttempt(key, request); if (limited) return limited;
    await recordFailedLogin(key, request);
    if (!recoveryConfigured()) return Response.json({ message: "ระบบส่งอีเมลกู้คืนยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบโรงเรียน" }, { status: 503 });
    await requestPasswordRecovery(email);
    return Response.json({ message: recoveryMessage }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ message: "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 }); }
}
