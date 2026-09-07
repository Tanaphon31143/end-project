import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSignedSession, homeForRole, type AppRole } from "@/lib/auth";

type Account = RowDataPacket & {
  id: number;
  email: string;
  full_name: string;
  password_hash: string;
  role: AppRole;
  status: string;
};

export async function POST(request: Request) {
  const body = await request.json();
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password)
    return NextResponse.json(
      { message: "กรุณากรอกอีเมลและรหัสผ่าน" },
      { status: 400 },
    );
  const [result] = await db.execute<Account[]>(
    `
    SELECT id,email,full_name,password_hash,'admin' role,status FROM admins WHERE email=?
    UNION ALL SELECT id,email,full_name,password_hash,'teacher',status FROM teachers WHERE email=?
    UNION ALL SELECT id,email,full_name,password_hash,'student',status FROM students WHERE email=? LIMIT 1
  `,
    [email, email, email],
  );
  const account = result[0];
  if (
    !account ||
    account.status !== "ACTIVE" ||
    !verifyPassword(password, account.password_hash)
  )
    return NextResponse.json(
      { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" },
      { status: 401 },
    );
  const maxAge = body.rememberMe === true ? 7 * 86400 : 8 * 3600;
  const response = NextResponse.json({
    ok: true,
    role: account.role,
    redirectTo: homeForRole(account.role),
  });
  response.cookies.set(
    "school_os_session",
    createSignedSession(
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
