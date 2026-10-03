import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import mysql from "mysql2/promise";

const enabled = process.env.RUN_ADMIN_SECURITY === "1" && Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

async function roleCookie(role) {
  const parsed = new URL(process.env.DATABASE_URL);
  const connection = await mysql.createConnection({ host: parsed.hostname, port: Number(parsed.port || 3306), user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), database: parsed.pathname.slice(1), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } });
  try {
    const table = role === "admin" ? "admins" : role === "teacher" ? "teachers" : "students";
    const [[account]] = await connection.query(`SELECT id,full_name name,email FROM ${table} WHERE status='ACTIVE' ORDER BY id LIMIT 1`);
    assert.ok(account, `ต้องมีบัญชี ${role} สำหรับทดสอบ`);
    const payload = Buffer.from(JSON.stringify({ id: account.id, role, name: account.name, email: account.email, exp: Date.now() + 60_000 })).toString("base64url");
    return `school_os_session=${payload}.${createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url")}`;
  } finally {
    await connection.end();
  }
}

test("Admin APIs ปฏิเสธ Anonymous, Teacher และ Student", { skip: !enabled }, async () => {
  const routes = ["/api/users", "/api/teachers", "/api/students", "/api/subjects", "/api/classes", "/api/faces", "/api/attendance", "/api/admin/reports", "/api/admin/settings", "/api/admin/notifications"];
  const teacher = await roleCookie("teacher");
  const student = await roleCookie("student");
  for (const route of routes) {
    assert.equal((await fetch(`${baseUrl}${route}`)).status, 401, `${route} ต้องปฏิเสธ Anonymous`);
    assert.equal((await fetch(`${baseUrl}${route}`, { headers: { cookie: teacher } })).status, 401, `${route} ต้องปฏิเสธ Teacher`);
    assert.equal((await fetch(`${baseUrl}${route}`, { headers: { cookie: student } })).status, 401, `${route} ต้องปฏิเสธ Student`);
  }
});

test("Admin session เรียก Admin APIs แบบอ่านได้", { skip: !enabled }, async () => {
  const admin = await roleCookie("admin");
  for (const route of ["/api/users", "/api/teachers", "/api/students", "/api/subjects", "/api/classes", "/api/faces", "/api/attendance", "/api/admin/reports", "/api/admin/settings", "/api/admin/notifications"]) {
    assert.equal((await fetch(`${baseUrl}${route}`, { headers: { cookie: admin } })).status, 200, `${route} ต้องอนุญาต Admin`);
  }
});

test("การแจ้งเตือน Admin รวมคำขอเปิดรายวิชาที่รออนุมัติ", { skip: !enabled }, async () => {
  const parsed = new URL(process.env.DATABASE_URL);
  const connection = await mysql.createConnection({ host: parsed.hostname, port: Number(parsed.port || 3306), user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), database: parsed.pathname.slice(1), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } });
  try {
    const [[row]] = await connection.query("SELECT COUNT(*) total FROM teacher_subject_requests WHERE status='PENDING'");
    const response = await fetch(`${baseUrl}/api/admin/notifications`, { headers: { cookie: await roleCookie("admin") } });
    assert.equal(response.status, 200);
    const body = await response.json();
    const subjectRequests = body.requests.filter((item) => item.kind === "SUBJECT_REQUEST");
    assert.equal(subjectRequests.length, Number(row.total));
    assert.ok(body.pendingCount >= subjectRequests.length);
  } finally {
    await connection.end();
  }
});
