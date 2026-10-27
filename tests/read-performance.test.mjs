import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { parseAcademicTerm, termEnrollmentWhere } from "../src/lib/academic-term-rules.mjs";

const academicTerm = { getSchoolTerm: async () => ({ academicYear: "2569", semester: 1 }), parseAcademicTerm, termEnrollmentWhere };

function compiled(path) {
  return ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

// student-data and teacher-data build avatar initials with this pure helper.
const nameInitials = (() => {
  const exports = {};
  vm.runInNewContext(compiled("../src/lib/name-initials.ts"), { exports });
  return exports;
})();

function adminReads(execute, date = Date) {
  const exports = {};
  vm.runInNewContext(compiled("../src/lib/admin-data.ts"), { exports, Date: date, Map, Set,
    require: name => name === "@/lib/db" ? { db: { execute } } : name === "@/lib/academic-term" ? academicTerm : {} });
  return exports;
}

test("dashboard school dates remain correct before UTC midnight and across a month boundary", async () => {
  for (const [instant, expected] of [["2026-10-04T22:27:00Z", "2026-10-05"], ["2026-09-30T18:00:00Z", "2026-10-01"]]) {
    class FixedDate extends Date { static now() { return Date.parse(instant); } }
    const queries = [];
    const api = adminReads(async sql => {
      queries.push(sql);
      return [sql.includes("FROM school_settings") ? [{ schoolName: "School", academicYear: "2569", semester: 1 }] : []];
    }, FixedDate);
    const result = await api.getDashboardData();
    assert.equal(result.daily.at(-1).date, expected);
    assert.equal(result.daily.length, 30);
    assert.ok(queries.some(sql => sql.includes("DATE(UTC_TIMESTAMP() + INTERVAL 7 HOUR)")));
    assert.ok(queries.every(sql => !sql.includes("CURRENT_DATE")));
  }
});

test("student today's timetable uses the Thai weekday and preserves student ownership", async () => {
  const exports = {};
  let timetableRead = false;
  vm.runInNewContext(compiled("../src/lib/student-data.ts"), { exports, Date, Intl, Map, Set,
    require(name) {
      if (name === "react") return { cache: fn => fn };
      if (name === "@/lib/name-initials") return nameInitials;
      if (name === "@/lib/academic-term") return academicTerm;
      if (name === "@/lib/db") return { db: { async execute(sql, args) {
        if (sql.includes("WEEKDAY(")) {
          timetableRead = true;
          assert.doesNotMatch(sql, /CURRENT_DATE/);
          assert.match(sql, /WEEKDAY\(UTC_TIMESTAMP\(\) \+ INTERVAL 7 HOUR\)/);
          assert.deepEqual(Array.from(args), [7, 1, "2569"]);
          assert.match(sql, /student_term_enrollments/);
          assert.match(sql, /ste.semester=sb.semester AND ste.academic_year=sb.academic_year/);
          return [[{ id: 3, startTime: "08:30", endTime: "09:30" }]];
        }
        if (sql.includes("FROM school_settings")) return [[{ semester: 1, academicYear: "2569" }]];
        if (sql.includes("s.full_name name") && sql.includes("WHERE s.id=?")) {
          assert.deepEqual(Array.from(args), [1, "2569", 7]);
          return [[{ id: 7, name: "Test", code: "S7", classId: 4 }]];
        }
        return [[]];
      } } };
      return {};
    },
  });
  const result = await exports.getStudentDashboardData(7);
  assert.ok(timetableRead);
  assert.equal(result.student.id, 7);
  assert.equal(result.today[0].id, 3);
});

test("check-in starts all four independent reads together and retains schedules", async () => {
  const pendingReads = [];
  const api = adminReads((sql) => new Promise(resolve => pendingReads.push({ sql, resolve })));
  const pending = api.getCheckInPageData("2026-10-05");
  assert.equal(pendingReads.length, 4);
  for (const { sql, resolve } of pendingReads) {
    if (sql.includes("FROM schedules")) resolve([[{ id: 9, subjectId: 2, startTime: "08:30" }]]);
    else if (sql.includes("FROM subjects")) resolve([[{ id: 2 }]]);
    else resolve([[]]);
  }
  const result = await pending;
  assert.equal(result.subjects[0].schedules[0].id, 9);
});

test("single-pass report totals and chart values match the original calculations", async () => {
  const records = Array.from({ length: 2000 }, (_, i) => ({
    date: i % 3 ? "2026-10-05" : "2026-10-04", studentCode: String(i),
    status: ["PRESENT", "LATE", "ABSENT", "LEAVE"][i % 4],
  }));
  const api = adminReads(async sql => {
    if (sql.includes("FROM attendance_records")) return [records];
    if (sql.includes("COUNT(*) students")) return [[{ students: 49 }]];
    return [[]];
  });
  const result = await api.getReportData();
  assert.equal(result.records, records, "No records are removed or reordered");
  assert.equal(result.summary.total, 2000);
  assert.equal(result.summary.students, 49);
  for (const [key, status] of [["present", "PRESENT"], ["late", "LATE"], ["absent", "ABSENT"], ["leave", "LEAVE"]]) {
    assert.equal(result.summary[key], records.filter(x => x.status === status).length);
  }
  const dates = [...new Set(records.map(x => x.date))].sort();
  assert.equal(result.daily.length, dates.length);
  dates.forEach((date, i) => {
    const rows = records.filter(x => x.date === date);
    const attended = rows.filter(x => x.status === "PRESENT" || x.status === "LATE").length;
    assert.equal(result.daily[i].students, attended);
    assert.equal(result.daily[i].rate, Number((100 * attended / rows.length).toFixed(2)));
  });
});

test("grouped face sample IDs preserve ownership and original ordering", async () => {
  const faces = [{ studentId: 1 }, { studentId: 2 }, { studentId: 3 }];
  const samples = [{ id: 4, studentId: 2 }, { id: 5, studentId: 1 }, { id: 7, studentId: 2 }];
  const api = adminReads(async sql => {
    if (sql.includes("FROM face_samples")) return [samples];
    if (sql.includes("FROM face_data f JOIN")) return [faces];
    return [[]];
  });
  const result = await api.getFacePageData();
  for (const face of result.faces) assert.deepEqual(Array.from(face.sampleIds),
    samples.filter(x => x.studentId === face.studentId).map(x => x.id));
});

test("attendance page reuses catalog reads without changing options or active filtering", async () => {
  let count = 0;
  const catalog = [
    { databaseId: 1, subjectCode: "S1", subjectName: "One", classId: 3, isActive: 1, semester: 1, studyDays: "1,2", startTime: "08:00", endTime: "09:00" },
    { databaseId: 2, subjectCode: "S2", subjectName: "Two", classId: 3, isActive: 0, semester: 1, studyDays: "", startTime: "", endTime: "" },
  ];
  const api = adminReads(async sql => {
    count++;
    if (sql.includes("FROM subjects s")) return [catalog];
    if (sql.includes("FROM classrooms")) return [[{ id: 3, name: "4/1", level: "4" }]];
    if (sql.includes("FROM school_settings")) return [[{ academicYear: "2569" }]];
    return [[]];
  });
  const result = await api.getAttendancePageData();
  assert.equal(count, 8, "Catalog reads are reused; the extra lookup provides term enrollment options");
  assert.deepEqual(JSON.parse(JSON.stringify(result.subjects)), [{ id: 1, code: "S1", name: "One", classroomId: 3 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.classrooms)), [{ id: 3, name: "4/1" }]);
  assert.equal(result.catalogSubjects.length, 2, "Inactive subjects remain in the full catalog");
  assert.equal(result.catalogSubjects[0].weeklyPeriods, 2);
  assert.equal(result.catalogSubjects[1].weeklyPeriods, null);
});

test("production bundles reuse both database pools without sharing query results", () => {
  for (const [file, dependency, exportName] of [
    ["../src/lib/db.ts", "mysql2/promise", "db"],
    ["../src/lib/prisma.ts", "@prisma/client", "prisma"],
  ]) {
    let created = 0;
    const make = () => {
      created++;
      return { execute() {}, query() {}, getConnection() {} };
    };
    const globals = {};
    const context = vm.createContext({
      globalThis: globals,
      URL,
      process: { env: { NODE_ENV: "production", DATABASE_URL: "mysql://user:pass@localhost/test" } },
      require(name) {
        if (name === "server-only") return {};
        assert.equal(name, dependency);
        return name === "mysql2/promise"
          ? { default: { createPool: make } }
          : { PrismaClient: function () { return make(); } };
      },
    });
    const code = `(function(){const exports={};${compiled(file)};return exports;})()`;
    const first = vm.runInContext(code, context)[exportName];
    const second = vm.runInContext(code, context)[exportName];
    assert.equal(first, second);
    assert.equal(created, 1);
  }
});

test("teacher session details preserve ownership and attendance without fetching student blobs", async () => {
  const exports = {};
  let studentQueries = 0;
  let owned = true;
  const prisma = {
    checkInSession: { async findFirst(query) {
      assert.equal(query.where.subject.teacherId, 7);
      assert.equal(query.where.id, 12n);
      assert.equal(query.include.attendance.include, undefined);
      return owned ? {
        id: 12n, sessionDate: new Date("2026-10-05T00:00:00Z"),
        classroomId: 3, status: "CLOSED", startTime: null, endTime: null,
        subject: { subjectCode: "M1", subjectName: "Math", academicYear: "2569", semester: 1, classroom: { name: "1/1" } },
        attendance: [{ studentId: 1, status: "PRESENT", checkInTime: null, confidence: 95 }],
      } : null;
    } },
    student: { async findMany(query) {
      studentQueries++;
      assert.deepEqual(JSON.parse(JSON.stringify(query.select)), { id: true, studentCode: true, fullName: true });
      assert.deepEqual(JSON.parse(JSON.stringify(query.where.OR[0].termEnrollments.some)), { academicYear: "2569", semester: 1, classroomId: 3 });
      assert.equal(query.where.OR[0].status, "ACTIVE");
      assert.deepEqual(Array.from(query.where.OR[1].id.in), [1], "Existing attendance remains visible after a membership is removed");
      return [{ id: 1, studentCode: "S1", fullName: "One" }, { id: 2, studentCode: "S2", fullName: "Two" }];
    } },
  };
  vm.runInNewContext(compiled("../src/lib/teacher-data.ts"), {
    exports, Date, Intl, console,
    require(name) {
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/academic-term") return academicTerm;
      if (name === "react") return { cache: (fn) => fn };
      if (name === "@/lib/name-initials") return nameInitials;
      return {};
    },
  });
  const result = await exports.getTeacherSessionDetail(7, "12");
  assert.equal(result.students[0].status, "PRESENT");
  assert.equal(result.students[0].confidence, 95);
  assert.equal(result.students[1].status, null);
  owned = false;
  assert.equal(await exports.getTeacherSessionDetail(7, "12"), null);
  assert.equal(await exports.getTeacherSessionDetail(7, "invalid"), null);
  assert.equal(studentQueries, 1);
});

test("admin notifications read both queues concurrently and retain ordering and access checks", async () => {
  const exports = {};
  const reads = [];
  const resolveReads = [];
  let authorized = true;
  vm.runInNewContext(compiled("../src/app/api/admin/notifications/route.ts"), {
    exports,
    require(name) {
      if (name === "next/server") return { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } };
      if (name === "@/lib/auth") return { getAdminSession: async () => authorized ? { id: 1 } : null };
      if (name === "@/lib/db") return { db: { execute(sql) {
        reads.push(sql);
        return new Promise((resolve) => resolveReads.push(resolve));
      } } };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  const pending = exports.GET();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(reads.length, 2, "Both reads start before either returns");
  resolveReads[0]([[{ id: 1, hasAttachment: 1, createdAtEpoch: 100 }]]);
  resolveReads[1]([[{ id: 2, createdAtEpoch: 200 }]]);
  const response = await pending;
  assert.equal(response.body.pendingCount, 2);
  assert.equal(response.body.requests[0].kind, "SUBJECT_REQUEST");
  assert.equal(response.body.requests[1].hasAttachment, true);
  authorized = false;
  assert.equal((await exports.GET()).status, 401);
  assert.equal(reads.length, 2, "Anonymous access does not query notification data");
});
