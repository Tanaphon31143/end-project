import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

function compile(path) {
  return ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

function load(path, dependencies) {
  const exports = {};
  vm.runInNewContext(compile(path), { exports, Response, Request, Boolean, String,
    require(name) {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import ${name}`);
    } });
  return exports;
}

const policy = load("../src/lib/student-password-policy.ts", { "server-only": {}, "@/lib/db": { db: {} } });

function profileRoute({ passwordHash, mustChange }) {
  const updates = [];
  const revoked = [];
  const api = load("../src/app/api/student/profile/route.ts", {
    "@/lib/auth": {
      getStudentSession: async () => ({ id: 5, role: "student" }),
      revokeAccountSessions: async (role, id) => { revoked.push([role, id]); },
    },
    "@/lib/db": { db: { async execute(sql, values) {
      if (sql.trimStart().startsWith("SELECT")) return [[{ passwordHash, mustChange }]];
      updates.push({ sql, values });
      return [{ affectedRows: 1 }];
    } } },
    // A readable stand-in for scrypt: the stored hash is "hash:<password>".
    "@/lib/password": {
      hashPassword: (password) => `hash:${password}`,
      verifyPassword: async (password, stored) => stored === `hash:${password}`,
    },
    "@/lib/student-password-policy": policy,
  });
  const change = (body) => api.PATCH(new Request("https://school.test/api/student/profile", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  return { change, updates, revoked };
}

test("the shared import password is student@123", () => {
  assert.equal(policy.DEFAULT_IMPORTED_STUDENT_PASSWORD, "student@123");
});

test("a flagged student sets a new password without the current one, and the flag is cleared", async () => {
  const route = profileRoute({ passwordHash: "hash:student@123", mustChange: 1 });
  const response = await route.change({ newPassword: "MyOwnPass99", confirmPassword: "MyOwnPass99" });
  assert.equal(response.status, 200);
  assert.equal(route.updates.length, 1);
  assert.match(route.updates[0].sql, /SET password_hash=\?,must_change_password=0 WHERE id=\?/);
  assert.equal(route.updates[0].values[0], "hash:MyOwnPass99");
  assert.equal(route.updates[0].values[1], 5);
  assert.equal(JSON.stringify(route.revoked), JSON.stringify([["student", 5]]));
});

test("nobody can choose the shared import password as their new password", async () => {
  for (const mustChange of [1, 0]) {
    const route = profileRoute({ passwordHash: "hash:OldPass123", mustChange });
    const response = await route.change({ currentPassword: "OldPass123", newPassword: "student@123" });
    assert.equal(response.status, 400);
    assert.equal(route.updates.length, 0);
  }
});

test("a flagged student cannot keep the password the school handed out", async () => {
  const route = profileRoute({ passwordHash: "hash:AdminReset1", mustChange: 1 });
  const response = await route.change({ newPassword: "AdminReset1" });
  assert.equal(response.status, 400);
  assert.equal(route.updates.length, 0);
});

test("an unflagged student still has to confirm the current password", async () => {
  const missing = profileRoute({ passwordHash: "hash:OldPass123", mustChange: 0 });
  assert.equal((await missing.change({ newPassword: "NewPass123" })).status, 400);
  assert.equal(missing.updates.length, 0);

  const confirmed = profileRoute({ passwordHash: "hash:OldPass123", mustChange: 0 });
  assert.equal((await confirmed.change({ currentPassword: "OldPass123", newPassword: "NewPass123" })).status, 200);
  assert.match(confirmed.updates[0].sql, /must_change_password=0/);
});

test("imported accounts are created with the flag set", () => {
  const source = fs.readFileSync(new URL("../src/app/api/admin/students/import/route.ts", import.meta.url), "utf8");
  assert.match(source, /INSERT INTO students\(email,full_name,student_code,password_hash,must_change_password,parent_name,phone\) VALUES\(\?,\?,\?,\?,1,\?,\?\)/);
  assert.match(source, /hashPassword\(DEFAULT_IMPORTED_STUDENT_PASSWORD\)/);
  assert.doesNotMatch(source, /"student@123"/);
});

test("the student layout shows the forced change screen instead of any page", () => {
  const source = fs.readFileSync(new URL("../src/app/student/layout.tsx", import.meta.url), "utf8");
  const gate = source.indexOf("if (mustChangePassword) return <ForcedPasswordChange");
  assert.ok(gate > 0, "layout must gate on mustChangePassword");
  assert.ok(gate < source.indexOf("<StudentShell"), "gate must come before the shell renders children");
});
