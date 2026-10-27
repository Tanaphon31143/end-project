import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const sourceFiles = (dir) => fs.readdirSync(new URL(dir, import.meta.url), { recursive: true })
  .filter((name) => /\.tsx?$/.test(name))
  .map((name) => ({ name: `${dir}${name}`.replace(/\\/g, "/"), text: read(`${dir}${name}`) }));
const allSources = [...sourceFiles("../src/app/"), ...sourceFiles("../src/lib/"), ...sourceFiles("../src/components/")];

test("late is decided on school time, not the UTC database clock", () => {
  for (const path of ["../src/app/api/student/check-in/route.ts", "../src/app/api/check-in/route.ts"]) {
    const source = read(path);
    assert.match(source, /TIME_FORMAT\(UTC_TIMESTAMP\(\) \+ INTERVAL 7 HOUR, ?'%H:%i:%s'\) time/, path);
  }
  const usesDbClock = allSources.filter((file) => /\bCURRENT_TIME\b|\bCURTIME\(/.test(file.text)).map((file) => file.name);
  assert.deepEqual(usesDbClock, [], "CURRENT_TIME is UTC on this database");
});

test("admin-entered check-in times are stored in UTC like scans", () => {
  assert.match(read("../src/app/api/attendance/route.ts"),
    /attendance_date,check_in_time,status,confidence\) VALUES\(\?,\?,\?,CAST\(\? AS DATETIME\) - INTERVAL 7 HOUR,\?,NULL\)/);
});

test("every displayed timestamp column is shifted to school time", () => {
  const raw = /\b(?:DATE_FORMAT|TIME_FORMAT)\(\s*(?:[a-z]+\.)?(?:created_at|updated_at|reviewed_at|registered_at|check_in_time|read_at)\s*,/g;
  // Not shown as clock times: an optimistic-concurrency token compared byte-for-byte, and
  // announcements, whose client converts UTC itself.
  const exempt = new Set(["../src/app/api/attendance-issues/route.ts", "../src/lib/attendance-issues.ts", "../src/lib/announcements.ts"]);
  const offenders = allSources
    .filter((file) => !exempt.has(file.name))
    .flatMap((file) => (file.text.match(raw) || []).map((hit) => `${file.name}: ${hit}`));
  assert.deepEqual(offenders, []);
  assert.doesNotMatch(read("../src/lib/admin-data.ts"), /CAST\([a-z]+\.created_at AS CHAR\)/);
});

test("current student rooms come from the current term's enrollment, not students.class_id", () => {
  const adminData = read("../src/lib/admin-data.ts");
  assert.doesNotMatch(adminData, /c\.id=s\.class_id/);
  assert.match(adminData, /s\.student_code,cur_e\.classroom_id,COALESCE\(c\.name,''\)/, "user list room");
  assert.match(adminData, /FROM face_data f JOIN students s ON s\.id=f\.student_id \$\{currentTermClassroomJoin\("s"\)\}/);
  assert.match(adminData, /cur_e\.academic_year=cur_term\.academic_year AND cur_e\.semester=cur_term\.semester/);
  assert.doesNotMatch(read("../src/app/api/faces/recognize/route.ts"), /c\.id=s\.class_id/);
});

function profileRequestRoute({ fieldType, newValue, classroomExists = true, enrolled = true, duplicate = false }) {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push("begin"); },
    async commit() { calls.push("commit"); },
    async rollback() { calls.push("rollback"); },
    release() {},
    async execute(sql, values = []) {
      const text = sql.replace(/\s+/g, " ").trim();
      calls.push(text.slice(0, 40));
      if (text.startsWith("SELECT id, student_id studentId")) {
        return [[{ id: 3, studentId: 8, fieldType, oldValue: "x", newValue, status: "PENDING" }]];
      }
      if (text.startsWith("SELECT id FROM classrooms")) return [classroomExists ? [{ id: 12 }] : []];
      if (text.startsWith("UPDATE student_term_enrollments")) {
        if (duplicate) throw Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });
        assert.match(text, /JOIN \(SELECT academic_year,semester FROM school_settings ORDER BY id LIMIT 1\) term/);
        assert.equal(values[1], 8);
        return [{ affectedRows: enrolled ? 1 : 0 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const exports = {};
  const code = ts.transpileModule(read("../src/app/api/admin/profile-requests/route.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Number, String, console: { error() {} },
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } };
      if (name === "@/lib/auth") return { getAdminSession: async () => ({ id: 1 }) };
      if (name === "@/lib/db") return { db: { getConnection: async () => connection } };
      if (name === "@/lib/notifications") return { createNotification: async () => {} };
      throw new Error(`Unexpected import ${name}`);
    } });
  const approve = () => exports.PATCH(new Request("https://school.test/api/admin/profile-requests", {
    method: "PATCH", body: JSON.stringify({ requestId: 3, action: "APPROVE" }),
  }));
  return { approve, calls };
}

test("approving a room change moves the current-term enrollment", async () => {
  const route = profileRequestRoute({ fieldType: "CLASSROOM", newValue: "ม.5/2" });
  assert.equal((await route.approve()).status, 200);
  assert.ok(route.calls.some((call) => call.startsWith("UPDATE student_term_enrollments")));
  assert.ok(route.calls.includes("commit"));
});

test("a room change is not marked approved when it cannot be applied", async () => {
  for (const [options, status] of [
    [{ classroomExists: false }, 400],
    [{ enrolled: false }, 409],
  ]) {
    const route = profileRequestRoute({ fieldType: "CLASSROOM", newValue: "ม.9/9", ...options });
    assert.equal((await route.approve()).status, status, JSON.stringify(options));
    assert.ok(route.calls.includes("rollback"));
    assert.ok(!route.calls.includes("commit"));
    assert.ok(!route.calls.some((call) => call.startsWith("UPDATE profile_edit_requests")));
  }
});

test("a class number already taken in the room is reported instead of failing with 500", async () => {
  const route = profileRequestRoute({ fieldType: "CLASS_NUMBER", newValue: "7", duplicate: true });
  const response = await route.approve();
  assert.equal(response.status, 409);
  assert.match((await response.json()).message, /เลขที่นี้มีนักเรียนคนอื่นใช้แล้ว/);
  assert.ok(!route.calls.includes("commit"));
});
