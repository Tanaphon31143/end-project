import assert from "node:assert/strict";
import test from "node:test";
import { attendanceStatus, canAccessTeacherResource, intervalsOverlap } from "../src/lib/teacher-rules.mjs";

test("RBAC อนุญาตเฉพาะครูเจ้าของข้อมูล", () => {
  assert.equal(canAccessTeacherResource("teacher", 7, 7), true);
  assert.equal(canAccessTeacherResource("teacher", 8, 7), false);
  assert.equal(canAccessTeacherResource("student", 7, 7), false);
});

test("ตรวจช่วงเวลาทับซ้อนรวมกรณีคร่อมช่วง", () => {
  assert.equal(intervalsOverlap("08:30", "09:30", "09:00", "10:00"), true);
  assert.equal(intervalsOverlap("08:30", "09:30", "09:30", "10:00"), false);
});

test("คำนวณเข้าเรียนและมาสายตามเกณฑ์", () => {
  assert.equal(attendanceStatus(8 * 60 + 15, 8 * 60 + 15), "PRESENT");
  assert.equal(attendanceStatus(8 * 60 + 16, 8 * 60 + 15), "LATE");
});
