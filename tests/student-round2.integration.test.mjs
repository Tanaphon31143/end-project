import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import mysql from "mysql2/promise";

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const enabled = process.env.RUN_STUDENT_INTEGRATION === "1" && Boolean(databaseUrl) && Boolean(process.env.AUTH_SECRET);
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

async function fixture() {
  const parsed = new URL(databaseUrl);
  const connection = await mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
  });
  try {
    const [[student]] = await connection.query(
      "SELECT id,full_name name,email FROM students WHERE status='ACTIVE' ORDER BY id LIMIT 1",
    );
    assert.ok(student);
    const [[course]] = await connection.query(
      "SELECT sb.id FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id WHERE st.id=? AND sb.is_active=1 LIMIT 1",
      [student.id],
    );
    assert.ok(course);
    const payload = Buffer.from(JSON.stringify({
      id: student.id, role: "student", name: student.name, email: student.email, exp: Date.now() + 60_000,
    })).toString("base64url");
    const signature = createHmac("sha256", process.env.AUTH_SECRET).update(payload).digest("base64url");
    return { cookie: `school_os_session=${payload}.${signature}`, courseId: course.id };
  } finally {
    await connection.end();
  }
}

test("student round 2 pages render with real face metadata and course ownership", { skip: !enabled }, async () => {
  const auth = await fixture();
  for (const path of ["/student/face", "/student/courses", `/student/courses/${auth.courseId}?page=1`]) {
    const response = await fetch(`${baseUrl}${path}`, { headers: { cookie: auth.cookie } });
    assert.equal(response.status, 200, `${path} returned ${response.status}`);
  }
});
