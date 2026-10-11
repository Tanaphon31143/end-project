import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "./db";
import type { AppRole } from "./auth";
import { hashPassword } from "./password";

export const recoveryMessage = "หากมีบัญชีที่ใช้งานได้ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลนี้ กรุณาตรวจสอบกล่องจดหมายและจดหมายขยะ";
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function recoveryConfigured() {
  if (!process.env.RESEND_API_KEY || !process.env.PASSWORD_RESET_FROM || !process.env.APP_URL) return false;
  try { const url = new URL(process.env.APP_URL); return url.protocol === "https:" || (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname)); } catch { return false; }
}
export async function requestPasswordRecovery(email: string) {
  const [rows] = await db.execute<(RowDataPacket & { id: number; role: AppRole })[]>(`SELECT id,'admin' role FROM admins WHERE email=? AND status='ACTIVE'
    UNION ALL SELECT id,'teacher' FROM teachers WHERE email=? AND status='ACTIVE'
    UNION ALL SELECT id,'student' FROM students WHERE email=? AND status='ACTIVE' LIMIT 1`, [email, email, email]);
  const account = rows[0];
  if (!account) return;
  const token = randomBytes(32).toString("hex");
  const hash = tokenHash(token);
  await db.execute("INSERT INTO auth_password_resets (token_hash,account_id,account_role,expires_at) VALUES (?,?,?,DATE_ADD(NOW(3),INTERVAL 30 MINUTE))", [hash, account.id, account.role]);
  const url = new URL("/reset-password", process.env.APP_URL!);
  url.searchParams.set("token", token);
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `password-reset/${hash}` }, body: JSON.stringify({ from: process.env.PASSWORD_RESET_FROM, to: [email], subject: "ตั้งรหัสผ่านใหม่ | School OS", text: `เปิดลิงก์นี้เพื่อตั้งรหัสผ่านใหม่ภายใน 30 นาที:\n${url.href}\n\nหากคุณไม่ได้ส่งคำขอ สามารถละเว้นอีเมลนี้ได้` }) });
    if (!response.ok) throw new Error("EMAIL_DELIVERY_FAILED");
  } catch {
    await db.execute("DELETE FROM auth_password_resets WHERE token_hash=?", [hash]);
    // Never expose the account's existence through the public response.
    console.error("Password recovery email delivery failed");
  }
}
export async function resetPassword(token: string, password: string) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<(RowDataPacket & { account_id: number; account_role: AppRole })[]>("SELECT account_id,account_role FROM auth_password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>NOW(3) FOR UPDATE", [tokenHash(token)]);
    const reset = rows[0];
    if (!reset) { await connection.rollback(); return false; }
    const table = { admin: "admins", teacher: "teachers", student: "students" }[reset.account_role];
    if (!table) throw new Error("INVALID_ROLE");
    // Account lock serializes concurrent resets using different tokens.
    const [accounts] = await connection.execute<RowDataPacket[]>(`SELECT id FROM ${table} WHERE id=? AND status='ACTIVE' FOR UPDATE`, [reset.account_id]);
    if (!accounts.length) { await connection.rollback(); return false; }
    await connection.execute(`UPDATE ${table} SET password_hash=? WHERE id=?`, [hashPassword(password), reset.account_id]);
    await connection.execute("UPDATE auth_password_resets SET used_at=NOW(3) WHERE account_role=? AND account_id=? AND used_at IS NULL", [reset.account_role, reset.account_id]);
    await connection.execute("UPDATE auth_sessions SET revoked_at=NOW(3) WHERE account_role=? AND account_id=? AND revoked_at IS NULL", [reset.account_role, reset.account_id]);
    await connection.commit(); return true;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
