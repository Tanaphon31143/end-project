import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { parseAcademicTerm } from "../src/lib/academic-term-rules.mjs";
import { parseStudentTermAssignment } from "../src/lib/student-term-roster-rules.mjs";

function fixture({ authorized = true, alreadyEnrolled = false, failure = false } = {}) {
  const statements = [], events = [];
  const connection = {
    beginTransaction: async () => events.push("begin"),
    commit: async () => events.push("commit"), rollback: async () => events.push("rollback"),
    release: () => events.push("release"),
    execute: async (sql, args) => {
      statements.push({ sql, args });
      if (sql.startsWith("SELECT id,student_code FROM students")) return [[{ id: 42, student_code: "S42" }]];
      if (sql.startsWith("SELECT id FROM student_term_enrollments")) return [alreadyEnrolled ? [{ id: 8 }] : []];
      if (sql.startsWith("SELECT id FROM classrooms")) {
        assert.doesNotMatch(sql, /academic_year|semester/, "configured classrooms must be reusable in a new term");
        return [[{ id: 3 }]];
      }
      if (sql.startsWith("SELECT student_id FROM student_term_enrollments")) return [[]];
      if (failure && sql.startsWith("INSERT INTO student_term_enrollments")) throw new Error("database unavailable");
      return [{ affectedRows: 1, insertId: 80 }];
    },
  };
  const dependencies = {
    "@/lib/auth": { getAdminSession: async () => authorized ? { id: 1 } : null, revokeAccountSessions: async () => { throw Error("enrollment must not revoke an unchanged account"); } },
    "@/lib/db": { db: { getConnection: async () => connection } },
    "@/lib/admin-data": {},
    "@/lib/password": { hashPassword: () => { throw Error("existing account password must not be changed"); } },
    "@/lib/admin-audit": { recordAdminAudit: async () => events.push("audit") },
    "@/lib/academic-term": { getSchoolTerm: async () => ({ academicYear: "2569", semester: 1 }), parseAcademicTerm },
    "@/lib/student-term-roster-rules.mjs": { parseStudentTermAssignment },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL("../src/app/api/students/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Response, URL, console: { error() {} }, require(name) { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return { api: exports, statements, events };
}
const enrollmentRequest = () => new Request("https://school.test/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ENROLL_EXISTING", studentCode: "S42", classId: 3, classNumber: 7, academicYear: "2569", semester: 2, fullName: "must-not-replace", password: "must-not-replace" }) });

test("adding an existing account into term 2 writes only its selected membership", async () => {
  const { api, statements, events } = fixture();
  assert.equal((await api.POST(enrollmentRequest())).status, 201);
  const inserts = statements.filter(({ sql }) => /^(INSERT|UPDATE|DELETE)/.test(sql));
  assert.equal(inserts.length, 1);
  assert.match(inserts[0].sql, /^INSERT INTO student_term_enrollments/);
  assert.deepEqual(Array.from(inserts[0].args), [42, 3, "2569", 2, 7]);
  assert.deepEqual(events, ["begin", "commit", "audit", "release"]);
});

test("existing membership is rejected without touching identity or enrollment", async () => {
  const { api, statements, events } = fixture({ alreadyEnrolled: true });
  assert.equal((await api.POST(enrollmentRequest())).status, 409);
  assert.ok(statements.every(({ sql }) => sql.startsWith("SELECT")));
  assert.deepEqual(events, ["begin", "rollback", "release"]);
});

test("a failed enrollment rolls back and always releases the connection", async () => {
  const { api, events } = fixture({ failure: true });
  assert.equal((await api.POST(enrollmentRequest())).status, 500);
  assert.deepEqual(events, ["begin", "rollback", "release"]);
});

test("unauthenticated enrollment cannot access the database", async () => {
  const { api, statements } = fixture({ authorized: false });
  assert.equal((await api.POST(enrollmentRequest())).status, 401);
  assert.equal(statements.length, 0);
});

test("removing a student from term 2 preserves their account and term 1", async () => {
  const { api, statements, events } = fixture();
  assert.equal((await api.DELETE(new Request("https://school.test/api/students?id=42&academicYear=2569&semester=2", { method: "DELETE" }))).status, 200);
  assert.equal(statements.length, 1);
  assert.match(statements[0].sql, /^DELETE FROM student_term_enrollments WHERE student_id=\? AND academic_year=\? AND semester=\?/);
  assert.deepEqual(Array.from(statements[0].args), [42, "2569", 2]);
  assert.deepEqual(events, ["begin", "commit", "audit", "release"]);
});
