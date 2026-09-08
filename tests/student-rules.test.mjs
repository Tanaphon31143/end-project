import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessStudentResource,
  canSubmitProfileRequest,
  evaluateCheckInEligibility,
  evaluateScanRateLimit,
  filterActiveSessions,
  processApprovalTransaction,
  validateAttachment,
  validateLogin,
} from "../src/lib/student-rules.mjs";

test("1. Login สำเร็จและไม่สำเร็จตามเงื่อนไข", () => {
  const activeUser = { id: 10, email: "student@school.ac.th", status: "ACTIVE" };
  const inactiveUser = { id: 11, email: "suspended@school.ac.th", status: "INACTIVE" };

  // กรณีสำเร็จ
  const successLogin = validateLogin({
    email: "student@school.ac.th",
    password: "CorrectPassword123",
    storedUser: activeUser,
    isPasswordCorrect: true,
  });
  assert.equal(successLogin.success, true);
  assert.equal(successLogin.user.id, 10);

  // กรณีรหัสผ่านผิด
  const wrongPassword = validateLogin({
    email: "student@school.ac.th",
    password: "WrongPassword",
    storedUser: activeUser,
    isPasswordCorrect: false,
  });
  assert.equal(wrongPassword.success, false);
  assert.equal(wrongPassword.reason, "INVALID_PASSWORD");

  // กรณีไม่พบบัญชีผู้ใช้
  const notFound = validateLogin({
    email: "nonexistent@school.ac.th",
    password: "Password123",
    storedUser: null,
    isPasswordCorrect: false,
  });
  assert.equal(notFound.success, false);
  assert.equal(notFound.reason, "USER_NOT_FOUND");

  // กรณีบัญชีถูกระงับ (INACTIVE)
  const inactive = validateLogin({
    email: "suspended@school.ac.th",
    password: "Password123",
    storedUser: inactiveUser,
    isPasswordCorrect: true,
  });
  assert.equal(inactive.success, false);
  assert.equal(inactive.reason, "ACCOUNT_INACTIVE");
});

test("2. RBAC: ผู้ใช้ที่ไม่ใช่นักเรียนเข้า Student API ไม่ได้", () => {
  assert.equal(canAccessStudentResource("teacher", 10, 10), false);
  assert.equal(canAccessStudentResource("admin", 10, 10), false);
  assert.equal(canAccessStudentResource("guest", 10, 10), false);
  assert.equal(canAccessStudentResource(undefined, 10, 10), false);
});

test("3. RBAC: นักเรียนเข้าดูได้เฉพาะข้อมูลของตนเอง และไม่สามารถเข้าถึงของคนอื่น", () => {
  // นักเรียนดูข้อมูลตนเองได้
  assert.equal(canAccessStudentResource("student", 10, 10), true);
  // นักเรียนเข้าถึงข้อมูลของนักเรียนคนอื่นไม่ได้
  assert.equal(canAccessStudentResource("student", 10, 99), false);
  assert.equal(canAccessStudentResource("student", 10, 1), false);
});

test("4. การเลือกคาบที่เปิดอยู่ได้อย่างถูกต้องตามห้องเรียนและเวลา", () => {
  const sessions = [
    {
      id: 1,
      classroomId: 2, // ห้อง ม.5/2
      startTime: "08:30",
      endTime: "09:30",
      status: "ACTIVE",
    },
    {
      id: 2,
      classroomId: 1, // ห้อง ม.5/1
      startTime: "08:30",
      endTime: "09:30",
      status: "ACTIVE",
    },
    {
      id: 3,
      classroomId: 1, // ห้อง ม.5/1 แต่สถานะ CLOSED
      startTime: "08:30",
      endTime: "09:30",
      status: "CLOSED",
    },
    {
      id: 4,
      classroomId: 1, // ห้อง ม.5/1 แต่เวลาคนละช่วง (10:00 - 11:00)
      startTime: "10:00",
      endTime: "11:00",
      status: "ACTIVE",
    },
  ];

  // นักเรียนห้อง ม.5/1 ณ เวลา 09:00 ต้องพบเฉพาะคาบ ID 2 เท่านั้น
  const activeForStudent = filterActiveSessions(sessions, "09:00", 1);
  assert.equal(activeForStudent.length, 1);
  assert.equal(activeForStudent[0].id, 2);

  // นักเรียนห้อง ม.5/2 ณ เวลา 09:00 ต้องพบเฉพาะคาบ ID 1
  const activeForStudent2 = filterActiveSessions(sessions, "09:00", 2);
  assert.equal(activeForStudent2.length, 1);
  assert.equal(activeForStudent2[0].id, 1);

  // ณ เวลา 12:00 (หมดเวลาแล้ว) ต้องไม่พบคราบเปิด
  const expiredSessions = filterActiveSessions(sessions, "12:00", 1);
  assert.equal(expiredSessions.length, 0);
});

test("5. ป้องกันการเช็คชื่อซ้ำ", () => {
  const result = evaluateCheckInEligibility({
    alreadyCheckedIn: true,
    sessionExpired: false,
    livenessPassed: true,
    similarity: 0.85,
    threshold: 0.55,
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "ALREADY_ATTENDED");
});

test("6. ปฏิเสธเมื่อคาบหมดเวลา", () => {
  const result = evaluateCheckInEligibility({
    alreadyCheckedIn: false,
    sessionExpired: true,
    livenessPassed: true,
    similarity: 0.85,
    threshold: 0.55,
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "SESSION_EXPIRED");
});

test("7. ปฏิเสธเมื่อ Liveness Detection ไม่ผ่าน", () => {
  const result = evaluateCheckInEligibility({
    alreadyCheckedIn: false,
    sessionExpired: false,
    livenessPassed: false, // ไม่ผ่านการตรวจจับบุคคลจริง
    similarity: 0.85,
    threshold: 0.55,
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "LIVENESS_FAILED");
});

test("8. ปฏิเสธเมื่อใบหน้าไม่ตรง (Similarity < Threshold)", () => {
  const result = evaluateCheckInEligibility({
    alreadyCheckedIn: false,
    sessionExpired: false,
    livenessPassed: true,
    similarity: 0.42, // ต่ำกว่าเกณฑ์ 0.55
    threshold: 0.55,
  });
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "FACE_NOT_MATCHED");
});

test("9. เช็คชื่อสำเร็จและคำนวณสถานะมาเรียน/มาสายถูกต้อง", () => {
  // สแกนทันเวลา (ก่อน lateAfter 08:45)
  const onTime = evaluateCheckInEligibility({
    alreadyCheckedIn: false,
    sessionExpired: false,
    livenessPassed: true,
    similarity: 0.78,
    threshold: 0.55,
    currentTime: "08:35:00",
    lateAfter: "08:45:00",
  });
  assert.equal(onTime.eligible, true);
  assert.equal(onTime.status, "PRESENT");
  assert.equal(onTime.confidence, 78.0);

  // สแกนหลังเวลา lateAfter (มาสาย)
  const late = evaluateCheckInEligibility({
    alreadyCheckedIn: false,
    sessionExpired: false,
    livenessPassed: true,
    similarity: 0.82,
    threshold: 0.55,
    currentTime: "08:50:00",
    lateAfter: "08:45:00",
  });
  assert.equal(late.eligible, true);
  assert.equal(late.status, "LATE");
});

test("10. Server Rate Limiting ทำงานถูกต้อง (ล็อกเมื่อผิดพลาด >= 5 ครั้งใน 10 นาที)", () => {
  // ผิด 2 ครั้ง: ยังไม่ล็อก เหลือ 3 ครั้ง
  const check2 = evaluateScanRateLimit(2, 5, 10);
  assert.equal(check2.isLimited, false);
  assert.equal(check2.remainingAttempts, 3);

  // ผิด 4 ครั้ง: ยังไม่ล็อก เหลือ 1 ครั้ง
  const check4 = evaluateScanRateLimit(4, 5, 10);
  assert.equal(check4.isLimited, false);
  assert.equal(check4.remainingAttempts, 1);

  // ผิด 5 ครั้งขึ้นไป: ต้องถูกล็อกชั่วคราว
  const check5 = evaluateScanRateLimit(5, 5, 10);
  assert.equal(check5.isLimited, true);
  assert.equal(check5.remainingAttempts, 0);
  assert.equal(check5.retryAfterMinutes, 10);
});

test("11. ป้องกันคำร้องแก้ไขข้อมูลซ้ำซ้อนขณะยังมีสถานะ PENDING", () => {
  const existing = [
    { fieldType: "FULL_NAME", status: "PENDING" },
    { fieldType: "STUDENT_CODE", status: "REJECTED" },
  ];

  // ส่งคำร้องชื่อ-สกุลซ้ำ -> ต้องปฏิเสธ
  const dup = canSubmitProfileRequest(existing, "FULL_NAME");
  assert.equal(dup.allowed, false);
  assert.equal(dup.reason, "DUPLICATE_PENDING");

  // ส่งคำร้องรหัสนักเรียน (คำร้องเดิม REJECTED ไปแล้ว) -> ต้องอนุญาต
  const codeReq = canSubmitProfileRequest(existing, "STUDENT_CODE");
  assert.equal(codeReq.allowed, true);

  // ส่งคำร้องห้องเรียน (ไม่เคยมีคำร้อง) -> ต้องอนุญาต
  const roomReq = canSubmitProfileRequest(existing, "CLASSROOM");
  assert.equal(roomReq.allowed, true);
});

test("12. ตรวจสอบประเภทและขนาดไฟล์แนบ", () => {
  assert.equal(validateAttachment("image/jpeg", 2 * 1024 * 1024).valid, true);
  assert.equal(validateAttachment("image/png", 1024 * 1024).valid, true);
  assert.equal(validateAttachment("application/pdf", 4 * 1024 * 1024).valid, true);

  // ปฏิเสธไฟล์ขนาดเกิน 5 MB
  assert.equal(validateAttachment("image/jpeg", 6 * 1024 * 1024).valid, false);

  // ปฏิเสธประเภทไฟล์ที่ไม่ปลอดภัย (เช่น exe, svg, script)
  assert.equal(validateAttachment("application/x-msdownload", 500).valid, false);
  assert.equal(validateAttachment("image/svg+xml", 500).valid, false);
});

test("13. การอนุมัติคำร้องใช้ Transaction (Atomicity & Rollback)", async () => {
  let studentUpdated = false;
  let requestApproved = false;
  let auditCreated = false;
  let notified = false;

  const mockRequest = {
    id: 101,
    studentId: 5,
    fieldType: "FULL_NAME",
    newValue: "สมชาย รักเรียน",
  };

  // กรณีสำเร็จ: ทุกขั้นตอนผ่านและ Commit
  const successResult = await processApprovalTransaction({
    request: mockRequest,
    updateStudentRecord: async () => { studentUpdated = true; },
    updateRequestStatus: async () => { requestApproved = true; },
    createAuditLog: async () => { auditCreated = true; },
    createNotification: async () => { notified = true; },
  });

  assert.equal(successResult.success, true);
  assert.equal(successResult.committed, true);
  assert.equal(studentUpdated, true);
  assert.equal(requestApproved, true);
  assert.equal(auditCreated, true);
  assert.equal(notified, true);

  // กรณีล้มเหลว: เกิดข้อผิดพลาดระหว่างทาง ต้อง Rollback
  const failResult = await processApprovalTransaction({
    request: mockRequest,
    updateStudentRecord: async () => { throw new Error("DB Connection Interrupted"); },
    updateRequestStatus: async () => { requestApproved = true; },
    createAuditLog: async () => { auditCreated = true; },
    createNotification: async () => { notified = true; },
  });

  assert.equal(failResult.success, false);
  assert.equal(failResult.committed, false);
  assert.match(failResult.error, /DB Connection Interrupted/);
});
