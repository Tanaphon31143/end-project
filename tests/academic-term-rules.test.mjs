import assert from "node:assert/strict";
import test from "node:test";
import { parseAcademicTerm, termEnrollmentWhere } from "../src/lib/academic-term-rules.mjs";

test("term navigation uses school defaults without replacing an explicitly selected old term", () => {
  const current = { academicYear: "2569", semester: 2 };
  assert.deepEqual(parseAcademicTerm({}, current), current);
  assert.deepEqual(parseAcademicTerm({ academicYear: "2568", semester: "1" }, current), { academicYear: "2568", semester: 1 });
});

test("invalid or incomplete selected term identifiers are rejected", () => {
  for (const input of [{ semester: 0 }, { semester: 3 }, { semester: "" }, { academicYear: "" }, { academicYear: "2569 OR 1=1" }]) {
    assert.throws(() => parseAcademicTerm(input, { academicYear: "2569", semester: 1 }), /ภาคเรียน/);
  }
});

test("student eligibility always includes the exact subject classroom and term", () => {
  assert.deepEqual(termEnrollmentWhere({ academicYear: "2569", semester: 2 }, 12), { academicYear: "2569", semester: 2, classroomId: 12 });
});
