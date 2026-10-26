import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import mysql from "mysql2/promise";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { parseAcademicTerm, termEnrollmentWhere } from "../src/lib/academic-term-rules.mjs";
import { normalizeCoursePage } from "../src/lib/face-registration-rules.mjs";

const enabled = process.env.RUN_ACADEMIC_TERM_INTEGRATION === "1" && Boolean(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
function load(path, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, Intl, Map, Set, console, require(name) {
    if (name === "server-only") return {};
    if (name === "react") return { cache: fn => fn };
    assert.ok(name in dependencies, `Unexpected import ${name}`);
    return dependencies[name];
  } });
  return exports;
}

test("real admin, teacher and student data loaders keep selected semesters isolated", { skip: !enabled }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  const db = mysql.createPool({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }, connectionLimit: 4 });
  url.searchParams.set("sslaccept", "strict");
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const getSchoolTerm = async () => {
    const [[term]] = await db.execute("SELECT academic_year academicYear,semester FROM school_settings ORDER BY id LIMIT 1");
    return term;
  };
  const dependencies = { "@/lib/db": { db }, "./db": { db }, "@/lib/prisma": { prisma }, "@/lib/academic-term": { getSchoolTerm, parseAcademicTerm, termEnrollmentWhere }, "./academic-term": { getSchoolTerm, parseAcademicTerm, termEnrollmentWhere }, "@/lib/face-registration-rules.mjs": { normalizeCoursePage } };
  try {
    const admin = load("../src/lib/admin-data.ts", dependencies);
    const teacher = load("../src/lib/teacher-data.ts", dependencies);
    const student = load("../src/lib/student-data.ts", dependencies);
    const term = await getSchoolTerm();
    const [[teacherRow]] = await db.execute("SELECT id FROM teachers WHERE status='ACTIVE' ORDER BY id LIMIT 1");
    const [[studentRow]] = await db.execute("SELECT id FROM students WHERE status='ACTIVE' ORDER BY id LIMIT 1");
    for (const semester of [1, 2]) {
      const selectedTerm = { academicYear: term.academicYear, semester };
      const roster = await admin.getStudentPageData(selectedTerm);
      const [[expected]] = await db.execute("SELECT COUNT(*) total FROM student_term_enrollments e JOIN students s ON s.id=e.student_id WHERE e.academic_year=? AND e.semester=?", [term.academicYear, semester]);
      assert.equal(roster.students.length, Number(expected.total));
      assert.equal(Number(roster.semester), semester);
      assert.ok(roster.students.every(row => Number(row.semester) === semester && row.academicYear === term.academicYear));
      if (teacherRow) {
        const courses = await teacher.getTeacherCourses(teacherRow.id, selectedTerm);
        assert.ok(courses.every(course => course.semester === semester && course.academicYear === term.academicYear));
        for (const course of courses) {
          const [[count]] = await db.execute("SELECT COUNT(*) total FROM student_term_enrollments e JOIN students s ON s.id=e.student_id AND s.status='ACTIVE' WHERE e.classroom_id=? AND e.academic_year=? AND e.semester=?", [course.classroomId, course.academicYear, course.semester]);
          assert.equal(course.students, Number(count.total));
        }
      }
      if (studentRow) {
        const stats = await student.getStudentStatistics(studentRow.id, selectedTerm);
        assert.equal(stats.filters.semester, semester);
        assert.equal(stats.filters.academicYear, term.academicYear);
      }
    }
    if (studentRow) {
      const courses = await student.getStudentCourses(studentRow.id);
      assert.ok(courses.every(course => course.semester === Number(term.semester) && course.academicYear === term.academicYear));
      assert.ok(await student.getStudentDashboardData(studentRow.id));
    }
  } finally {
    await prisma.$disconnect();
    await db.end();
  }
});
