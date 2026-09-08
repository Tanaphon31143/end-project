import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import mysql from "mysql2/promise";

const enabled = process.env.RUN_TEACHER_SECURITY === "1" && Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

async function teacherCookie() {
  const parsed = new URL(process.env.DATABASE_URL);
  const connection = await mysql.createConnection({ host: parsed.hostname, port: Number(parsed.port || 3306), user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), database: parsed.pathname.slice(1), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } });
  try {
    const [[teacher]] = await connection.query(`SELECT id,full_name name,email FROM teachers WHERE status='ACTIVE' ORDER BY id LIMIT 1`);
    assert.ok(teacher, "ต้องมีบัญชีครูสำหรับทดสอบ");
    const payload = Buffer.from(JSON.stringify({ id: teacher.id, role: "teacher", name: teacher.name, email: teacher.email, exp: Date.now() + 60_000 })).toString("base64url");
    return `school_os_session=${payload}.${createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url")}`;
  } finally { await connection.end(); }
}

test("Teacher APIs บังคับ RBAC, CSRF และ rate limit", { skip: !enabled }, async () => {
  const unauthorized = await fetch(`${baseUrl}/api/teacher/history`);
  assert.equal(unauthorized.status, 401);
  const cookie = await teacherCookie();
  const allowed = await fetch(`${baseUrl}/api/teacher/history?page=1&pageSize=5`, { headers: { cookie } });
  assert.equal(allowed.status, 200);
  const csrf = await fetch(`${baseUrl}/api/teacher/notifications`, { method: "PATCH", headers: { cookie, origin: "https://evil.example", host: "localhost:3000", "content-type": "application/json" }, body: "{}" });
  assert.equal(csrf.status, 403);
  let lastStatus = 0;
  for (let index = 0; index < 31; index++) {
    const response = await fetch(`${baseUrl}/api/faces/recognize`, { method: "POST", headers: { cookie, origin: baseUrl, "content-type": "application/json" }, body: JSON.stringify({ sessionId: "0", embedding: [] }) });
    lastStatus = response.status;
  }
  assert.equal(lastStatus, 429);
});
