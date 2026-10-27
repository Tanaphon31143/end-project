import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const studentId = 42;
const termTwoSession = {
  id: 101,
  subjectId: 12,
  subjectCode: "MATH-2",
  subjectName: "คณิตศาสตร์",
  teacherName: "ครูทดสอบ",
  room: "4/2",
  periodName: "คาบ 1",
  sessionDate: "2026-10-17",
  startTime: "08:00",
  endTime: "09:00",
  lateAfter: "08:10:00",
  status: "ACTIVE",
  alreadyCheckedIn: 0,
  remainingSeconds: 300,
  isOpenNow: 1,
  availability: "OPEN",
};

function loadCheckIn(enrollments) {
  const exports = {};
  let query;
  const source = fs.readFileSync(
    new URL("../src/lib/student-check-in.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "server-only") return {};
      assert.equal(name, "@/lib/db");
      return {
        db: {
          async execute(sql, values) {
            query = { sql, values: Array.from(values) };
            const [attemptUserId, requestedUserId] = values;
            const hasTermMembership = enrollments.some(
              (enrollment) =>
                enrollment.studentId === requestedUserId &&
                enrollment.classroomId === 9 &&
                enrollment.semester === 2 &&
                enrollment.academicYear === "2569",
            );
            return [[
              hasTermMembership
                ? { ...termTwoSession, alreadyCheckedIn: attemptUserId === studentId ? 0 : 1 }
                : undefined,
            ].filter(Boolean)];
          },
        },
      };
    },
  });

  return {
    getActiveSessions: () => exports.getActiveSessionsForStudent(studentId),
    getQuery: () => query,
  };
}

test("term 1 membership in the same classroom does not grant term 2 check-in access", async () => {
  const api = loadCheckIn([
    { studentId, classroomId: 9, semester: 1, academicYear: "2569" },
  ]);

  assert.deepEqual(await api.getActiveSessions(), []);
  const { sql, values } = api.getQuery();
  assert.match(sql, /JOIN student_term_enrollments ste/);
  assert.match(sql, /ste\.semester = sb\.semester AND ste\.academic_year = sb\.academic_year/);
  assert.doesNotMatch(sql, /st\.class_id/);
  assert.deepEqual(values, [studentId, studentId]);
});

test("adding term 2 membership reuses the existing student identity for check-in", async () => {
  const api = loadCheckIn([
    { studentId, classroomId: 4, semester: 1, academicYear: "2569" },
    { studentId, classroomId: 9, semester: 2, academicYear: "2569" },
  ]);

  const sessions = await api.getActiveSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, termTwoSession.id);
  assert.equal(sessions[0].alreadyCheckedIn, false);
});
