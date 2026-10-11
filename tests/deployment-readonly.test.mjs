import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.DEPLOYMENT_TEST_URL;
const options = { skip: !base, timeout: 30_000 };
async function read(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, new URL(base).origin);
  return fetch(url, { redirect: "manual", signal: AbortSignal.timeout(20_000) });
}
test("production login page loads with security headers", options, async () => {
  const response = await read("/");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
  assert.match(await response.text(), /เข้าสู่ระบบ/);
});
test("production database read succeeds without cached health results", options, async () => {
  const response = await read("/api/db-health");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  assert.equal((await response.json()).connected, true);
});
for (const role of ["admin", "teacher", "student"]) {
  test(`${role} dashboard requires login in production`, options, async () => {
    const response = await read(`/${role}/dashboard`);
    assert.ok([302, 303, 307, 308].includes(response.status));
    assert.equal(new URL(response.headers.get("location"), base).pathname, "/");
    await response.arrayBuffer();
  });
}
for (const path of ["/api/admin/reports", "/api/teacher/courses", "/api/student/notifications", "/api/attendance-issues"]) {
  test(`${path} denies anonymous data access in production`, options, async () => {
    const response = await read(path);
    assert.equal(response.status, 401);
    await response.arrayBuffer();
  });
}
