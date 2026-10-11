import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Response, Request, URL, Uint8Array,
    require(name) { return dependencies[name] || {}; } });
  return exports;
}

function fixture({ role = "teacher", owner = 7, failAudit = false } = {}) {
  const calls = [];
  const row = { id: 1, teacherId: owner, status: "PENDING", resolution: "", updatedAt: "2026-10-05 09:00:00" };
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async execute(sql) {
      if (sql.startsWith("SELECT")) return [[row]];
      calls.push(sql.startsWith("UPDATE") ? "update" : "audit");
      if (failAudit && sql.startsWith("INSERT")) throw new Error("audit failed");
      return [{}];
    },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() { calls.push("release"); },
  };
  const api = load("../src/app/api/attendance-issues/route.ts", {
    "@/lib/auth": { getAdminSession: async () => role === "admin" ? { id: 2 } : null,
      getTeacherSession: async () => role === "teacher" ? { id: 7 } : null },
    "@/lib/api-security": { protectTeacherMutation: () => null },
    "@/lib/db": { db: { getConnection: async () => connection } },
    "@/lib/attendance-issues": { getAttendanceIssues: async (id) => [{ scope: id ?? "all" }] },
  });
  const patch = (extra = {}) => api.PATCH(new Request("http://localhost/api/attendance-issues", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, status: "COMPLETED", resolution: "ตรวจสอบแล้ว", expectedStatus: row.status,
      expectedUpdatedAt: row.updatedAt, expectedResolution: row.resolution, ...extra }),
  }));
  return { api, patch, calls };
}

test("staff issue reads enforce role and teacher scope", async () => {
  for (const role of ["admin", "teacher", "student"]) {
    const { api } = fixture({ role });
    const response = await api.GET();
    assert.equal(response.status, role === "student" ? 401 : 200);
    if (response.ok) assert.equal((await response.json()).issues[0].scope, role === "admin" ? "all" : 7);
  }
});
test("teacher cannot modify a different teacher's issue", async () => {
  const { patch, calls } = fixture({ owner: 8 });
  assert.equal((await patch()).status, 404);
  assert.deepEqual(calls, ["begin", "rollback", "release"]);
});
test("student cannot use staff mutation", async () => {
  const { patch, calls } = fixture({ role: "student" });
  assert.equal((await patch()).status, 401);
  assert.deepEqual(calls, []);
});
test("admin and owner save shared resolution with audit in one transaction", async () => {
  for (const role of ["admin", "teacher"]) {
    const { patch, calls } = fixture({ role });
    assert.equal((await patch()).status, 200);
    assert.deepEqual(calls, ["begin", "update", "audit", "commit", "release"]);
  }
});
test("stale status, timestamp or resolution cannot overwrite a newer review", async () => {
  for (const extra of [{ expectedStatus: "REVIEWING" }, { expectedUpdatedAt: "older" }, { expectedResolution: "older" }]) {
    const { patch, calls } = fixture();
    assert.equal((await patch(extra)).status, 409);
    assert.deepEqual(calls, ["begin", "rollback", "release"]);
  }
});
test("closing or rejecting requires an explanation", async () => {
  for (const status of ["COMPLETED", "REJECTED"]) {
    const { patch, calls } = fixture();
    assert.equal((await patch({ status, resolution: " " })).status, 400);
    assert.deepEqual(calls, []);
  }
});
test("audit failure rolls back the issue update", async () => {
  const { patch, calls } = fixture({ failAudit: true });
  assert.equal((await patch()).status, 500);
  assert.deepEqual(calls, ["begin", "update", "audit", "rollback", "release"]);
});
test("staff reads use the same issue table with a bound ownership filter", async () => {
  const queries = [];
  const api = load("../src/lib/attendance-issues.ts", { "@/lib/db": { db: {
    async execute(sql, args) { queries.push({ sql, args }); return [[]]; },
  } } });
  await api.getAttendanceIssues();
  await api.getAttendanceIssues(7);
  assert.match(queries[0].sql, /FROM attendance_issue_reports/);
  assert.doesNotMatch(queries[0].sql, /WHERE s.teacher_id/);
  assert.match(queries[1].sql, /WHERE s.teacher_id=\?/);
  assert.equal(queries[1].args[0], 7);
});

test("admin closing a session records only missing active students, once", async () => {
  const records = [];
  let active = true;
  const tx = {
    checkInSession: {
      async findUnique() { return { id: 12n, classroomId: 3, subjectId: 4, sessionDate: new Date("2026-10-05") }; },
      async updateMany() { const count = Number(active); active = false; return { count }; },
    },
    student: { async findMany(query) {
      assert.equal(query.where.status, "ACTIVE"); assert.equal(query.where.classId, 3);
      return [{ id: 1 }, { id: 2 }];
    } },
    attendanceRecord: {
      async findMany(query) { assert.equal(query.where.checkInSessionId, 12n); return [{ studentId: 1 }]; },
      async createMany({ data }) { records.push(...data); },
    },
    auditLog: { async create() {} },
  };
  const api = load("../src/app/api/check-in-sessions/route.ts", {
    "@/lib/auth": { getAdminSession: async () => ({ id: 2 }) },
    "@/lib/prisma": { prisma: { $transaction: async fn => fn(tx) } },
  });
  const request = () => new Request("http://localhost/api/check-in-sessions", {
    method: "PATCH", body: JSON.stringify({ id: 12, status: "CLOSED" }),
  });
  const first = await api.PATCH(request());
  assert.equal(first.status, 200);
  assert.equal((await first.json()).absentCreated, 1);
  assert.equal(records.length, 1);
  assert.equal(records[0].studentId, 2);
  assert.equal(records[0].status, "ABSENT");
  assert.equal((await (await api.PATCH(request())).json()).absentCreated, 0);
  assert.equal(records.length, 1);
});
