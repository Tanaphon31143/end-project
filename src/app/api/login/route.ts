import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, homeForRole, type AppRole } from "@/lib/auth";
import {
  consumeLoginAttempt,
  clearLoginRateLimit,
  recordFailedLogin,
  validateLoginRequest,
} from "@/lib/login-security";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

type Account = RowDataPacket & {
  id: number;
  email: string;
  full_name: string;
  password_hash: string;
  role: AppRole;
  status: string;
};

export async function POST(request: Request) {
  const rejected = validateLoginRequest(request);
  if (rejected) return rejected;

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > 16 * 1024)
      return NextResponse.json({ message: "ข้อมูลมีขนาดใหญ่เกินไป" }, { status: 413 });
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "ข้อมูล JSON ไม่ถูกต้อง" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ message: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" }, { status: 400 });

  const input = body as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!email || !password)
    return NextResponse.json(
      { message: "กรุณากรอกอีเมลและรหัสผ่าน" },
      { status: 400 },
    );
  if (email.length > 254 || password.length > 1024)
    return NextResponse.json({ message: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" }, { status: 400 });

  const limited = await consumeLoginAttempt(email, request);
  if (limited) return limited;

  const [result] = await db.execute<Account[]>(
    `
    SELECT id,email,full_name,password_hash,'admin' role,status FROM admins WHERE email=?
    UNION ALL SELECT id,email,full_name,password_hash,'teacher',status FROM teachers WHERE email=?
    UNION ALL SELECT id,email,full_name,password_hash,'student',status FROM students WHERE email=? LIMIT 1
  `,
    [email, email, email],
  );
  const account = result[0];
  const valid = account ? await verifyPassword(password, account.password_hash) : false;
  if (!account || account.status !== "ACTIVE" || !valid) {
    await recordFailedLogin(email, request);
    return NextResponse.json(
      { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 },
    );
  }

  await clearLoginRateLimit(email, request);
  const maxAge = input.rememberMe === true ? 7 * 86400 : 8 * 3600;
  const response = NextResponse.json({
    ok: true,
    role: account.role,
    redirectTo: homeForRole(account.role),
  });
  response.cookies.set(
    "school_os_session",
    await createSession(
      {
        id: account.id,
        role: account.role,
        name: account.full_name,
        email: account.email,
      },
      maxAge * 1000,
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    },
  );
  response.cookies.set("school_user", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}
