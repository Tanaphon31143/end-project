import assert from "node:assert/strict";
import test from "node:test";
import mysql from "mysql2/promise";
import { createTestSession } from "./helpers/session.mjs";

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const enabled = process.env.RUN_STUDENT_INTEGRATION === "1" && Boolean(databaseUrl) && Boolean(process.env.AUTH_SECRET);
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

test("student round 2 pages render with real face metadata and course ownership", { skip: !enabled }, async () => {
  const parsed = new URL(databaseUrl);
  const connection = await mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
  });
  let session;
  try {
    // A student still on the school-issued password is sent to the forced change screen instead.
    const [[student]] = await connection.query(
      "SELECT id,full_name name,email FROM students WHERE status='ACTIVE' AND must_change_password=0 ORDER BY id LIMIT 1",
    );
    assert.ok(student, "ต้องมีนักเรียนที่ตั้งรหัสผ่านเองแล้วสำหรับทดสอบ");
    const [[course]] = await connection.query(
      "SELECT sb.id FROM subjects sb JOIN student_term_enrollments ste ON ste.classroom_id=sb.classroom_id AND ste.academic_year=sb.academic_year AND ste.semester=sb.semester WHERE ste.student_id=? AND sb.is_active=1 LIMIT 1",
      [student.id],
    );
    assert.ok(course, "นักเรียนที่ใช้ทดสอบต้องมีรายวิชาที่เปิดอยู่");
    session = await createTestSession(connection, { ...student, role: "student" });
    for (const path of ["/student/face", "/student/courses", `/student/courses/${course.id}?page=1`]) {
      // Not following redirects keeps a bounce to the login page from passing as 200.
      const response = await fetch(`${baseUrl}${path}`, { headers: { cookie: session.cookie }, redirect: "manual" });
      assert.equal(response.status, 200, `${path} returned ${response.status}`);
    }
  } finally {
    await session?.revoke();
    await connection.end();
  }
});
