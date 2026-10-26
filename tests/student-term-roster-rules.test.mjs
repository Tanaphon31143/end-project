import test from "node:test";
import assert from "node:assert/strict";
import { parseStudentTermAssignment } from "../src/lib/student-term-roster-rules.mjs";

test("existing roster assignment accepts a student code with term placement only", () => {
  assert.deepEqual(
    parseStudentTermAssignment({
      action: "ENROLL_EXISTING",
      studentCode: "661001",
      academicYear: "2569",
      semester: 2,
      classId: 12,
      classNumber: 3,
    }),
    {
      value: {
        action: "ENROLL_EXISTING",
        studentId: null,
        studentCode: "661001",
        email: null,
        academicYear: "2569",
        semester: 2,
        classroomId: 12,
        classNumber: 3,
      },
    },
  );
});

test("existing roster assignment can use email without carrying identity edits", () => {
  const result = parseStudentTermAssignment({
    action: "ENROLL_EXISTING",
    email: "STUDENT@SCHOOL.AC.TH",
    academicYear: "2569",
    semester: 1,
    classId: 12,
    classNumber: 4,
    fullName: "must not be part of the assignment",
    password: "must not be part of the assignment",
  });

  assert.equal(result.value.email, "student@school.ac.th");
  assert.equal("fullName" in result.value, false);
  assert.equal("password" in result.value, false);
});

test("roster assignment rejects invalid term, room and number", () => {
  assert.match(
    parseStudentTermAssignment({
      action: "ENROLL_EXISTING",
      studentCode: "661001",
      academicYear: "2569",
      semester: 3,
      classId: 12,
      classNumber: 3,
    }).error,
    /ภาคเรียน/,
  );
  assert.match(
    parseStudentTermAssignment({
      action: "ENROLL_EXISTING",
      studentCode: "661001",
      academicYear: "2569",
      semester: 2,
      classId: 0,
      classNumber: 3,
    }).error,
    /ห้องเรียน/,
  );
  assert.match(
    parseStudentTermAssignment({
      action: "ENROLL_EXISTING",
      studentCode: "661001",
      academicYear: "2569",
      semester: 2,
      classId: 12,
      classNumber: 0,
    }).error,
    /เลขที่/,
  );
});
