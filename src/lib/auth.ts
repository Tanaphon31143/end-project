import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";

export type AppRole = "admin" | "teacher" | "student";
export type AppSession = {
  id: number;
  role: AppRole;
  name: string;
  email?: string;
  sessionId: string;
  /** Students only: still on a school-issued password. Read from the database, never the cookie. */
  mustChangePassword?: boolean;
};

type SessionPayload = AppSession & { exp: number };
type AccountRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  status: string;
  mustChangePassword: number;
};

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

function sessionHash(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

function signPayload(payload: string) {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function createSignedSession(session: AppSession, maxAgeMs = 8 * 60 * 60 * 1000) {
  const payload = Buffer.from(
    JSON.stringify({ ...session, exp: Date.now() + maxAgeMs }),
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function decodeSignedSession(value?: string): SessionPayload | null {
  if (!value) return null;
  try {
    const [payload, signature] = value.split(".");
    if (!payload || !signature) return null;
    const expected = signPayload(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    )
      return null;
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString(),
    ) as Partial<SessionPayload>;
    if (
      !["admin", "teacher", "student"].includes(String(data.role)) ||
      !Number.isInteger(data.id) ||
      typeof data.sessionId !== "string" ||
      data.sessionId.length < 32 ||
      typeof data.exp !== "number" ||
      data.exp < Date.now()
    )
      return null;
    return data as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  account: Omit<AppSession, "sessionId">,
  maxAgeMs = 8 * 60 * 60 * 1000,
) {
  const sessionId = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + maxAgeMs);
  await db.execute(
    `INSERT INTO auth_sessions
      (session_hash, account_id, account_role, expires_at)
     VALUES (?, ?, ?, ?)`,
    [sessionHash(sessionId), account.id, account.role, expiresAt],
  );
  return createSignedSession({ ...account, sessionId }, maxAgeMs);
}

async function verifiedSession(value?: string): Promise<AppSession | null> {
  const decoded = decodeSignedSession(value);
  if (!decoded) return null;
  // The role has already been validated by decodeSignedSession; table names
  // come exclusively from this allowlist, never from cookie text.
  const table = decoded.role === "admin" ? "admins" : decoded.role === "teacher" ? "teachers" : "students";
  // Only students carry must_change_password (school-issued import password).
  const mustChangeColumn = table === "students" ? "a.must_change_password" : "0";
  const [rows] = await db.execute<AccountRow[]>(
    `SELECT a.id, a.full_name name, a.email, a.status, ${mustChangeColumn} mustChangePassword
     FROM auth_sessions s JOIN ${table} a ON a.id=s.account_id
     WHERE s.session_hash=? AND s.account_id=? AND s.account_role=?
       AND s.revoked_at IS NULL AND s.expires_at>NOW(3)
       AND a.status='ACTIVE' LIMIT 1`,
    [sessionHash(decoded.sessionId), decoded.id, decoded.role],
  );
  const account = rows[0];
  if (!account) return null;
  return {
    id: account.id,
    role: decoded.role,
    name: account.name,
    email: account.email,
    sessionId: decoded.sessionId,
    ...(decoded.role === "student" ? { mustChangePassword: Boolean(account.mustChangePassword) } : {}),
  };
}

/** API answer for a student who must replace the school-issued password first. */
export function passwordChangeRequired() {
  return Response.json(
    { message: "กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งานระบบ", code: "PASSWORD_CHANGE_REQUIRED" },
    { status: 403 },
  );
}

export const getSession = cache(async () => {
  const store = await cookies();
  return verifiedSession(store.get("school_os_session")?.value);
});

export async function revokeSession(value?: string) {
  const decoded = decodeSignedSession(value);
  if (!decoded) return;
  await db.execute(
    "UPDATE auth_sessions SET revoked_at=NOW(3) WHERE session_hash=? AND revoked_at IS NULL",
    [sessionHash(decoded.sessionId)],
  );
}

export async function revokeAccountSessions(role: AppRole, accountId: number) {
  await db.execute(
    `UPDATE auth_sessions SET revoked_at=NOW(3)
     WHERE account_role=? AND account_id=? AND revoked_at IS NULL`,
    [role, accountId],
  );
}

export async function getTeacherSession() {
  const session = await getSession();
  return session?.role === "teacher" ? session : null;
}
export async function getAdminSession() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}
export async function getStudentSession() {
  const session = await getSession();
  return session?.role === "student" ? session : null;
}
export function homeForRole(role: AppRole) {
  return role === "admin"
    ? "/admin/dashboard"
    : role === "teacher"
      ? "/teacher/dashboard"
      : "/student";
}
