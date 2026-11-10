import assert from "node:assert/strict";
import test from "node:test";
import mysql from "mysql2/promise";
import { createTestSession } from "./helpers/session.mjs";

const enabled = process.env.RUN_ADMIN_SECURITY === "1" && Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const adminRoutes = ["/api/users", "/api/teachers", "/api/students", "/api/subjects", "/api/classes", "/api/faces", "/api/attendance", "/api/admin/reports", "/api/admin/settings", "/api/admin/notifications"];

function connect() {
  const parsed = new URL(process.env.DATABASE_URL);
  return mysql.createConnection({ host: parsed.hostname, port: Number(parsed.port || 3306), user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), database: parsed.pathname.slice(1), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } });
}

/** Runs `use` with a live session cookie per role, then removes those sessions. */
async function withSessions(roles, use) {
  const connection = await connect();
  const sessions = [];
  try {
    const cookies = {};
    for (const role of roles) {
      const table = role === "admin" ? "admins" : role === "teacher" ? "teachers" : "students";
      const [[account]] = await connection.query(`SELECT id,full_name name,email FROM ${table} WHERE status='ACTIVE' ORDER BY id LIMIT 1`);
      assert.ok(account, `ต้องมีบัญชี ${role} สำหรับทดสอบ`);
      const session = await createTestSession(connection, { ...account, role });
      sessions.push(session);
      cookies[role] = session.cookie;
    }
    return await use(cookies, connection);
  } finally {
    for (const session of sessions) await session.revoke();
    await connection.end();
  }
}

test("Admin APIs ปฏิเสธ Anonymous, Teacher และ Student", { skip: !enabled }, async () => {
  await withSessions(["teacher", "student"], async ({ teacher, student }) => {
    for (const route of adminRoutes) {
      assert.equal((await fetch(`${baseUrl}${route}`)).status, 401, `${route} ต้องปฏิเสธ Anonymous`);
      assert.equal((await fetch(`${baseUrl}${route}`, { headers: { cookie: teacher } })).status, 401, `${route} ต้องปฏิเสธ Teacher`);
      assert.equal((await fetch(`${baseUrl}${route}`, { headers: { cookie: student } })).status, 401, `${route} ต้องปฏิเสธ Student`);
    }
  });
});

test("Admin session เรียก Admin APIs แบบอ่านได้", { skip: !enabled }, async () => {
  await withSessions(["admin"], async ({ admin }) => {
    for (const route of adminRoutes) {
      assert.equal((await fetch(`${baseUrl}${route}`, { headers: { cookie: admin } })).status, 200, `${route} ต้องอนุญาต Admin`);
    }
  });
});

test("การแจ้งเตือน Admin รวมคำขอเปิดรายวิชาที่รออนุมัติ", { skip: !enabled }, async () => {
  await withSessions(["admin"], async ({ admin }, connection) => {
    const [[row]] = await connection.query("SELECT COUNT(*) total FROM teacher_subject_requests WHERE status='PENDING'");
    const response = await fetch(`${baseUrl}/api/admin/notifications`, { headers: { cookie: admin } });
    assert.equal(response.status, 200);
    const body = await response.json();
    const subjectRequests = body.requests.filter((item) => item.kind === "SUBJECT_REQUEST");
    assert.equal(subjectRequests.length, Number(row.total));
    assert.ok(body.pendingCount >= subjectRequests.length);
  });
});
