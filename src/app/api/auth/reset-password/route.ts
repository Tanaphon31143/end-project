import { consumeLoginAttempt, recordFailedLogin, validateLoginRequest } from "@/lib/login-security";
import { resetPassword } from "@/lib/password-recovery";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const rejected = validateLoginRequest(request); if (rejected) return rejected;
  let body;
  try { const raw = await request.text(); if (Buffer.byteLength(raw) > 16384) return Response.json({ message: "ข้อมูลมีขนาดใหญ่เกินไป" }, { status: 413 }); body = JSON.parse(raw); } catch { return Response.json({ message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  if (typeof body?.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token)) return Response.json({ message: "ลิงก์ไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่" }, { status: 400 });
  if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) return Response.json({ message: "รหัสผ่านต้องมี 8–128 ตัวอักษร" }, { status: 400 });
  try {
    const limited = await consumeLoginAttempt("password-reset", request); if (limited) return limited;
    await recordFailedLogin("password-reset", request);
    if (!(await resetPassword(body.token, body.password))) return Response.json({ message: "ลิงก์ถูกใช้แล้วหรือหมดอายุ กรุณาขอลิงก์ใหม่" }, { status: 400 });
    return Response.json({ message: "ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง" });
  } catch { return Response.json({ message: "ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 }); }
}
