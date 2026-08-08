import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "ข้อมูลไม่ครบถ้วน" }, { status: 400 });
  }

  const [rows] = await db.execute(
    `SELECT id, email, full_name, password_hash, 'teacher' AS role FROM teachers WHERE email = ?
     UNION ALL
     SELECT id, email, full_name, password_hash, 'student' AS role FROM students WHERE email = ?
     LIMIT 1`,
    [email.trim().toLowerCase(), email.trim().toLowerCase()],
  );
  const user = (rows as Array<{ id: number; email: string; full_name: string; password_hash: string; role: "teacher" | "student" }>)[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role: user.role, name: user.full_name });
  response.cookies.set("school_user", JSON.stringify({ id: user.id, role: user.role, name: user.full_name }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 8, path: "/",
  });
  return response;
}
