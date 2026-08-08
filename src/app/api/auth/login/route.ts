import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type Account = {
  id: number;
  email: string;
  full_name: string;
  password_hash: string;
  role: "student" | "teacher";
};

type AccountRow = Account & RowDataPacket;

function isPasswordValid(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex || !/^[0-9a-f]+$/i.test(expectedHex)) return false;

  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}

function createSession(account: Pick<Account, "id" | "email" | "role">) {
  const payload = Buffer.from(JSON.stringify({ ...account, exp: Date.now() + 7 * 86400000 })).toString("base64url");
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rememberMe = body.rememberMe === true;

    if (!email || !password) {
      return NextResponse.json({ message: "กรุณากรอกอีเมลและรหัสผ่าน" }, { status: 400 });
    }

    const [rows] = await db.query<AccountRow[]>(
      `
        SELECT id, email, full_name, password_hash, 'teacher' AS role FROM teachers WHERE email = ?
        UNION ALL
        SELECT id, email, full_name, password_hash, 'student' AS role FROM students WHERE email = ?
        LIMIT 1
      `,
      [email, email],
    );
    const account = rows[0];

    if (!account || !isPasswordValid(password, account.password_hash)) {
      return NextResponse.json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }

    const response = NextResponse.json({
      authenticated: true,
      user: { id: account.id, email: account.email, name: account.full_name, role: account.role },
    });
    response.cookies.set("school_os_session", createSession(account), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      ...(rememberMe ? { maxAge: 7 * 86400 } : {}),
    });
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ message: "ไม่สามารถเข้าสู่ระบบได้ในขณะนี้" }, { status: 500 });
  }
}
