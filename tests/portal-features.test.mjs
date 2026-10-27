import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import ts from "typescript";
import test from "node:test";

function load(file, dependencies, extras = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, URL, console, AbortSignal, process: { env: { NODE_ENV: "test" } }, require(name) { if (name === "server-only") return {}; if (name in dependencies) return dependencies[name]; throw new Error(name); }, ...extras });
  return exports;
}

test("teacher search scopes students and courses to the authenticated teacher and escapes wildcards", async () => {
  const calls = [];
  const loadedModule = load("../src/lib/portal-search.ts", {
    "./academic-term": { getSchoolTerm: async () => ({ academicYear: "2569", semester: 2 }) },
    "./db": { db: { async execute(sql, params) { calls.push({ sql, params }); return [[]]; } } },
  });
  await loadedModule.searchPortal({ id: 7, role: "teacher" }, "A%_!");
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /EXISTS\(SELECT 1 FROM subjects sub WHERE sub.teacher_id=\? AND sub.is_active=1/);
  assert.match(calls[0].sql, /s.status='ACTIVE'/);
  assert.match(calls[0].sql, /student_term_enrollments e/);
  assert.match(calls[0].sql, /sub.academic_year=e.academic_year AND sub.semester=e.semester/);
  assert.deepEqual(Array.from(calls[0].params), [7, "%A!%!_!!%", "%A!%!_!!%", 7]);
  assert.match(calls[1].sql, /teacher_id=\? AND is_active=1/);
  assert.equal(calls[1].params.at(-1), 7);
});

test("search API denies students and anonymous requests before querying", async () => {
  for (const session of [null, { id: 1, role: "student" }]) {
    const route = load("../src/app/api/search/route.ts", { "@/lib/auth": { getSession: async () => session }, "@/lib/portal-search": { searchPortal() { throw Error("must not query"); } } }, { Response });
    assert.equal((await route.GET(new Request("https://school.test/api/search?q=one"))).status, 401);
  }
});

function recovery(connection) {
  return load("../src/lib/password-recovery.ts", { "node:crypto": crypto, "./db": { db: { getConnection: async () => connection } }, "./password": { hashPassword: () => "hashed-password" } });
}
test("expired or used reset token rolls back without changing a password", async () => {
  const events = [];
  const loadedModule = recovery({ beginTransaction: async () => events.push("begin"), execute: async (sql) => { assert.match(sql, /used_at IS NULL AND expires_at>NOW\(3\) FOR UPDATE/); return [[]]; }, rollback: async () => events.push("rollback"), release: () => events.push("release") });
  assert.equal(await loadedModule.resetPassword("a".repeat(64), "password123"), false);
  assert.deepEqual(events, ["begin", "rollback", "release"]);
});
test("valid reset consumes tokens and revokes sessions in the password transaction", async () => {
  const events = [];
  const loadedModule = recovery({ beginTransaction: async () => events.push("begin"), execute: async (sql, args) => { events.push(sql); if (sql.startsWith("SELECT account")) { assert.equal(args[0], crypto.createHash("sha256").update("a".repeat(64)).digest("hex")); return [[{ account_id: 8, account_role: "teacher" }]]; } if (sql.startsWith("SELECT id")) return [[{ id: 8 }]]; return [{}]; }, commit: async () => events.push("commit"), rollback: async () => events.push("rollback"), release: () => events.push("release") });
  assert.equal(await loadedModule.resetPassword("a".repeat(64), "password123"), true);
  assert.match(events[3], /UPDATE teachers SET password_hash/);
  assert.match(events[4], /UPDATE auth_password_resets SET used_at/);
  assert.match(events[5], /UPDATE auth_sessions SET revoked_at/);
  assert.deepEqual(events.slice(-2), ["commit", "release"]);
});
test("failed password update rolls back and releases connection", async () => {
  let rolledBack = false, released = false;
  const loadedModule = recovery({ beginTransaction: async () => {}, execute: async (sql) => { if (sql.startsWith("SELECT account")) return [[{ account_id: 8, account_role: "student" }]]; if (sql.startsWith("SELECT id")) return [[{ id: 8 }]]; throw new Error("write failed"); }, rollback: async () => { rolledBack = true; }, release: () => { released = true; } });
  await assert.rejects(loadedModule.resetPassword("b".repeat(64), "password123"), /write failed/);
  assert.ok(rolledBack && released);
});
test("announcements only return published items for the dashboard", async () => {
  const calls = [];
  const loadedModule = load("../src/lib/announcements.ts", { "./db": { db: { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith("SHOW COLUMNS")) return [[{ Field: "title", Type: "varchar(200)" }]];
    if (sql.startsWith("SHOW TABLES")) return [[]];
    if (sql.startsWith("SELECT n.id")) return [[{ id: 1, title: "Real notice", message: "Content", published: 1, createdAt: "2026-10-05", status: "published" }]];
    return [[]];
  } } } });
  const result = await loadedModule.getAnnouncements();
  const announcementQuery = calls.find(({ sql }) => sql.startsWith("SELECT n.id"));
  assert.ok(announcementQuery, "loads announcement rows");
  assert.match(announcementQuery.sql, /WHERE n\.is_published=1/);
  assert.match(announcementQuery.sql, /ORDER BY n\.created_at DESC,n\.id DESC\s+LIMIT 5 OFFSET 0/);
  assert.deepEqual(Array.from(announcementQuery.params), []);
  assert.equal(result[0].published, true);
});

test("scheduled announcements are omitted from the student dashboard until publish_at", async () => {
  const calls = [];
  const loadedModule = load("../src/lib/announcements.ts", { "./db": { db: { execute: async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith("SHOW COLUMNS")) return [[
      { Field: "title", Type: "varchar(200)" },
      { Field: "publish_at", Type: "datetime(3)" },
    ]];
    if (sql.startsWith("SHOW TABLES")) return [[]];
    if (sql.startsWith("SELECT n.id")) return [[{ id: 1, title: "Visible notice", message: "Content", published: 1, scheduledAt: null, createdAt: "2026-10-05", status: "published" }]];
    return [[]];
  } } } });
  await loadedModule.getAnnouncements();
  const announcementQuery = calls.find(({ sql }) => sql.startsWith("SELECT n.id"));
  assert.ok(announcementQuery, "loads announcement rows");
  assert.match(announcementQuery.sql, /WHERE \(n\.is_published=1 AND \(n\.publish_at IS NULL OR n\.publish_at<=UTC_TIMESTAMP\(3\)\)\)/);
  assert.match(announcementQuery.sql, /CASE WHEN n\.is_published=0 THEN 'hidden' WHEN n\.publish_at>UTC_TIMESTAMP\(3\) THEN 'scheduled' ELSE 'published' END/);
});
