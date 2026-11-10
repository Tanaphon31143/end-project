import assert from "node:assert/strict";
import test from "node:test";
import { connectTestDatabase, createTestSession, firstActiveAccount } from "./helpers/session.mjs";

const enabled = process.env.RUN_TEACHER_SECURITY === "1" && Boolean(process.env.DATABASE_URL) && Boolean(process.env.AUTH_SECRET);
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

test("Teacher APIs บังคับ RBAC, CSRF และ rate limit", { skip: !enabled }, async () => {
  const unauthorized = await fetch(`${baseUrl}/api/teacher/history`);
  assert.equal(unauthorized.status, 401);
  const connection = await connectTestDatabase();
  let session;
  try {
    const teacher = await firstActiveAccount(connection, "teacher");
    assert.ok(teacher, "ต้องมีบัญชีครูสำหรับทดสอบ");
    session = await createTestSession(connection, teacher);
    const { cookie } = session;
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
  } finally {
    await session?.revoke();
    await connection.end();
  }
});
