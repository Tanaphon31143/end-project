import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function compile(path) {
  return ts.transpileModule(
    fs.readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
}

function loadPresenceHelper(execute) {
  const exports = {};
  vm.runInNewContext(compile("../src/lib/admin-presence.ts"), {
    exports,
    require(name) {
      if (name === "server-only") return {};
      if (name === "@/lib/db") return { db: { execute } };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return exports;
}

function loadAdminData(execute) {
  const exports = {};
  vm.runInNewContext(compile("../src/lib/admin-data.ts"), {
    exports,
    Promise,
    Map,
    Set,
    require(name) {
      if (name === "server-only") return {};
      if (name === "@/lib/db") return { db: { execute } };
      if (name === "@/lib/academic-term") {
        return { getSchoolTerm: async () => ({ academicYear: "2569", semester: 1 }) };
      }
      return {};
    },
  });
  return exports;
}

function loadRoute({ session = { id: 1, role: "admin" }, identities = [], authError, presenceError } = {}) {
  const exports = {};
  let presenceReads = 0;
  vm.runInNewContext(compile("../src/app/api/admin/presence/route.ts"), {
    exports,
    Response,
    require(name) {
      if (name === "@/lib/auth") {
        return { getAdminSession: async () => {
          if (authError) throw authError;
          return session;
        } };
      }
      if (name === "@/lib/admin-presence") {
        return { getLoggedInAccountIdentities: async () => {
          presenceReads++;
          if (presenceError) throw presenceError;
          return identities;
        } };
      }
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { route: exports, get presenceReads() { return presenceReads; } };
}

test("presence query isolates role and ID, ignores revoked/expired sessions and disabled accounts", async () => {
  let sql = "";
  const api = loadPresenceHelper(async (query) => {
    sql = query;
    return [[
      { role: "admin", id: 2 },
      { role: "teacher", id: 2 },
      { role: "student", id: "2" },
    ]];
  });
  const accounts = await api.getLoggedInAccountIdentities();

  assert.deepEqual(JSON.parse(JSON.stringify(accounts)), [
    { role: "admin", id: 2 },
    { role: "teacher", id: 2 },
    { role: "student", id: 2 },
  ]);
  for (const [role, alias] of [["admin", "a"], ["teacher", "t"], ["student", "st"]]) {
    assert.match(sql, new RegExp(`'${role}' role,${alias}\\.id`));
    assert.match(sql, new RegExp(`account_role='${role}' AND s\\.account_id=${alias}\\.id`));
  }
  assert.equal((sql.match(/status='ACTIVE'/g) || []).length, 3);
  assert.equal((sql.match(/revoked_at IS NULL/g) || []).length, 3);
  assert.equal((sql.match(/expires_at>NOW\(3\)/g) || []).length, 3);
});

test("all management records expose session presence separately from account status", async () => {
  const queries = [];
  const api = loadAdminData(async (sql) => {
    queries.push(sql);
    if (sql.includes("FROM student_term_enrollments e JOIN students s ON s.id=e.student_id")) {
      return [[{ databaseId: 8, isLoggedIn: 1, status: "ACTIVE" }]];
    }
    if (sql.includes("SELECT t.id databaseId")) {
      return [[{ databaseId: 8, isLoggedIn: 0, status: "ACTIVE" }]];
    }
    if (sql.includes("SELECT CONCAT('A',a.id)")) {
      return [[{ id: "A8", databaseId: 8, isLoggedIn: 1, status: "ACTIVE" }]];
    }
    return [[]];
  });

  const users = await api.getUsers();
  const students = await api.getStudentPageData();
  const teachers = await api.getTeacherPageData();

  assert.equal(users[0].isLoggedIn, 1);
  assert.equal(users[0].status, "ACTIVE");
  assert.equal(students.students[0].isLoggedIn, 1);
  assert.equal(students.students[0].status, "ACTIVE");
  assert.equal(teachers.teachers[0].isLoggedIn, 0);
  assert.equal(teachers.teachers[0].status, "ACTIVE");
  const presenceQueries = queries.filter((sql) => /isLoggedIn/.test(sql));
  assert.equal(presenceQueries.length, 3);
  assert.ok(presenceQueries.every((sql) => /account_role='(?:admin|teacher|student)'/.test(sql)));
});

test("presence endpoint authenticates before reading identities and sends private no-store headers", async () => {
  const denied = loadRoute({ session: null, identities: [{ role: "student", id: 8 }] });
  const deniedResponse = await denied.route.GET();
  assert.equal(deniedResponse.status, 401);
  assert.equal(denied.presenceReads, 0);
  assert.equal(deniedResponse.headers.get("cache-control"), "private, no-store");

  const authorized = loadRoute({ identities: [{ role: "teacher", id: 9 }] });
  const response = await authorized.route.GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accounts: [{ role: "teacher", id: 9 }] });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("vary"), "Cookie");
});

test("presence endpoint reports auth or database read failures without exposing details", async () => {
  const authFailure = loadRoute({ authError: new Error("db secret details") });
  const authResponse = await authFailure.route.GET();
  assert.equal(authResponse.status, 500);
  assert.deepEqual(await authResponse.json(), { error: "Unable to read login status" });
  assert.equal(authResponse.headers.get("cache-control"), "private, no-store");

  const presenceFailure = loadRoute({ presenceError: new Error("db secret details") });
  const presenceResponse = await presenceFailure.route.GET();
  assert.equal(presenceResponse.status, 500);
  assert.deepEqual(await presenceResponse.json(), { error: "Unable to read login status" });
  assert.equal(presenceResponse.headers.get("cache-control"), "private, no-store");
});
