import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const studentId = 42;
const priorSubject = {
  id: 12,
  code: "HIST-1",
  name: "ประวัติศาสตร์",
  semester: 1,
  academicYear: "2568",
};

function loadStudentData({
  schoolTerm = { semester: 2, academicYear: "2569" },
  subjectOptions = [priorSubject],
  attendanceRecords = [{
    attendanceDate: "2025-10-20",
    status: "PRESENT",
    subjectId: priorSubject.id,
    subjectCode: priorSubject.code,
    subjectName: priorSubject.name,
    classTime: "08:00–09:00",
    semester: priorSubject.semester,
    academicYear: priorSubject.academicYear,
  }],
} = {}) {
  const exports = {};
  const source = fs.readFileSync(
    new URL("../src/lib/student-data.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  let statsRead = false;

  vm.runInNewContext(compiled, {
    exports,
    Intl,
    require(name) {
      if (name === "server-only") return {};
      if (name === "react") return { cache: (fn) => fn };
      if (name === "@/lib/academic-term") {
        return { getSchoolTerm: async () => schoolTerm };
      }
      if (name === "@/lib/face-registration-rules.mjs") {
        return { normalizeCoursePage: () => ({ page: 1, pageSize: 20, offset: 0 }) };
      }
      if (name === "@/lib/name-initials") {
        const helper = {};
        vm.runInNewContext(ts.transpileModule(
          fs.readFileSync(new URL("../src/lib/name-initials.ts", import.meta.url), "utf8"),
          { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
        ).outputText, { exports: helper });
        return helper;
      }
      assert.equal(name, "@/lib/db");
      return {
        db: {
          async execute(sql, values = []) {
            if (sql.includes("FROM students s")) {
              return [[{
                id: studentId,
                name: "นักเรียนทดสอบ",
                code: "S42",
                email: "student@example.test",
                phone: "",
                birthday: "",
                address: "",
                hasProfileImage: 0,
                faceReady: 1,
                classId: null,
                className: "ยังไม่ระบุ",
                classLevel: "",
                classNumber: null,
              }]];
            }
            if (sql.includes("termSubjects")) {
              assert.match(sql, /UNION/);
              assert.match(sql, /attendance_records owned ON owned\.subject_id=sb\.id AND owned\.student_id=\?/);
              assert.deepEqual(Array.from(values), [studentId, studentId]);
              return [subjectOptions];
            }
            if (sql.includes("FROM attendance_records a")) {
              statsRead = true;
              assert.match(sql, /a\.student_id=\?/);
              assert.doesNotMatch(sql, /JOIN student_term_enrollments/);
              assert.equal(values[0], studentId);
              assert.ok([1, 2].includes(Number(values[1])));
              assert.match(String(values[2]), /^\d{4}$/);
              return [[...attendanceRecords.filter((record) =>
                record.semester === Number(values[1]) && record.academicYear === values[2])]];
            }
            return [[]];
          },
        },
      };
    },
  });

  return {
    getStatistics: (requested) => exports.getStudentStatistics(studentId, requested),
    wasStatsRead: () => statsRead,
  };
}

test("prior attendance remains available after the term enrollment changes", async () => {
  const api = loadStudentData();
  const result = await api.getStatistics({ semester: 1, academicYear: "2568" });

  assert.ok(api.wasStatsRead());
  assert.equal(result.filters.semester, 1);
  assert.equal(result.filters.academicYear, "2568");
  assert.equal(result.summary.present, 1);
  assert.deepEqual(Array.from(result.options.terms, ({ semester, academicYear }) => ({ semester, academicYear })), [
    { semester: 2, academicYear: "2569" },
    { semester: 1, academicYear: "2569" },
    { semester: 2, academicYear: "2568" },
    { semester: 1, academicYear: "2568" },
  ]);
});

test("a requested term with no subjects stays selected and has empty statistics", async () => {
  const api = loadStudentData({
    schoolTerm: { semester: 1, academicYear: "2569" },
    subjectOptions: [{ ...priorSubject, academicYear: "2569" }],
    attendanceRecords: [{
      attendanceDate: "2026-01-15",
      status: "PRESENT",
      subjectId: priorSubject.id,
      subjectCode: priorSubject.code,
      subjectName: priorSubject.name,
      classTime: "08:00–09:00",
      semester: 1,
      academicYear: "2569",
    }],
  });
  const result = await api.getStatistics({ semester: 2, academicYear: "2569" });

  assert.equal(result.filters.semester, 2);
  assert.equal(result.filters.academicYear, "2569");
  assert.equal(result.summary.total, 0);
  assert.equal(result.options.subjects.length, 0);
  assert.deepEqual(Array.from(result.options.terms, ({ semester, academicYear }) => ({ semester, academicYear })), [
    { semester: 2, academicYear: "2569" },
    { semester: 1, academicYear: "2569" },
  ]);
});

test("the configured empty school term is the default instead of the previous term", async () => {
  const api = loadStudentData({
    schoolTerm: { semester: 2, academicYear: "2569" },
    subjectOptions: [{ ...priorSubject, academicYear: "2569" }],
    attendanceRecords: [{
      attendanceDate: "2026-01-15",
      status: "PRESENT",
      subjectId: priorSubject.id,
      subjectCode: priorSubject.code,
      subjectName: priorSubject.name,
      classTime: "08:00–09:00",
      semester: 1,
      academicYear: "2569",
    }],
  });
  const result = await api.getStatistics();

  assert.equal(result.filters.semester, 2);
  assert.equal(result.filters.academicYear, "2569");
  assert.equal(result.summary.total, 0);
});
