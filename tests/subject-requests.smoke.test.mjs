import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import mysql from "mysql2/promise";

const enabled = process.env.RUN_SUBJECT_REQUEST_SMOKE === "1" && Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
function cookie(id, role, name) {
  const payload = Buffer.from(JSON.stringify({ id, role, name, exp: Date.now() + 60_000 })).toString("base64url");
  return `school_os_session=${payload}.${createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url")}`;
}
test("คำขอรายวิชาตรวจสิทธิ์และข้อมูลก่อนบันทึก", { skip: !enabled }, async () => {
  const parsed = new URL(process.env.DATABASE_URL);
  const connection = await mysql.createConnection({ host: parsed.hostname, port: Number(parsed.port || 3306), user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), database: parsed.pathname.slice(1), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } });
  try {
    const [[teacher]] = await connection.query("SELECT id,full_name name FROM teachers WHERE status='ACTIVE' ORDER BY id LIMIT 1");
    const [[admin]] = await connection.query("SELECT id,full_name name FROM admins ORDER BY id LIMIT 1");
    assert.ok(teacher && admin, "ต้องมีครูและผู้ดูแลระบบสำหรับ smoke test");
    assert.equal((await fetch(`${baseUrl}/api/teacher/subject-requests`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/admin/subject-requests`, { headers: { cookie: cookie(teacher.id, "teacher", teacher.name) } })).status, 401);
    const teacherResponse = await fetch(`${baseUrl}/api/teacher/subject-requests`, { headers: { cookie: cookie(teacher.id, "teacher", teacher.name) } });
    assert.equal(teacherResponse.status, 200);
    assert.ok(Array.isArray((await teacherResponse.json()).requests));
    const adminResponse = await fetch(`${baseUrl}/api/admin/subject-requests`, { headers: { cookie: cookie(admin.id, "admin", admin.name) } });
    assert.equal(adminResponse.status, 200);
    assert.ok(Array.isArray((await adminResponse.json()).requests));
    for (const [path, role, id, name, marker] of [
      ["/teacher/dashboard", "teacher", teacher.id, teacher.name, "ตารางสอนวันนี้"],
      ["/teacher/subject-requests", "teacher", teacher.id, teacher.name, "คำขอเปิดรายวิชา"],
      ["/admin/subjects", "admin", admin.id, admin.name, "คำขอเปิดรายวิชาจากครู"],
    ]) {
      const page = await fetch(`${baseUrl}${path}`, { headers: { cookie: cookie(id, role, name) } });
      assert.equal(page.status, 200, `${path} should render`);
      assert.match(await page.text(), new RegExp(marker));
    }
    const invalid = await fetch(`${baseUrl}/api/teacher/subject-requests`, { method: "POST", headers: { cookie: cookie(teacher.id, "teacher", teacher.name), origin: baseUrl, "content-type": "application/json" }, body: JSON.stringify({ subjectName: "" }) });
    assert.equal(invalid.status, 400);
    const csrf = await fetch(`${baseUrl}/api/admin/subject-requests`, { method: "PATCH", headers: { cookie: cookie(admin.id, "admin", admin.name), origin: "https://invalid.example", host: new URL(baseUrl).host, "content-type": "application/json" }, body: "{}" });
    assert.equal(csrf.status, 403);
  } finally { await connection.end(); }
});
