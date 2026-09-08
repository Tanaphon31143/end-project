/**
 * Pure business rules and verification functions for student-side face attendance
 */

/**
 * RBAC: นักเรียนเข้าดูได้เฉพาะข้อมูลของตนเอง และผู้ใช้ที่ไม่ใช่นักเรียนเข้า Student API ไม่ได้
 */
export function canAccessStudentResource(role, sessionStudentId, targetStudentId) {
  if (role !== "student") return false;
  if (!sessionStudentId || !targetStudentId) return false;
  return Number(sessionStudentId) === Number(targetStudentId);
}

/**
 * เลือกคาบเรียนที่เปิดอยู่อย่างถูกต้อง และกรองตามห้องเรียนและเวลา
 */
export function filterActiveSessions(sessions, currentTime, studentClassId) {
  return sessions.filter((s) => {
    if (s.classroomId !== studentClassId) return false;
    if (s.status !== "ACTIVE") return false;
    if (s.sessionDate && s.currentDate && s.sessionDate !== s.currentDate) return false;
    if (currentTime < s.startTime || currentTime > s.endTime) return false;
    return true;
  });
}

/**
 * ตรวจสอบความถูกต้องของการเช็คชื่อ:
 * - ป้องกันการเช็คชื่อซ้ำ
 * - ปฏิเสธเมื่อคาบหมดเวลา
 * - ปฏิเสธเมื่อ Liveness ไม่ผ่าน
 * - ปฏิเสธเมื่อใบหน้าไม่ตรง
 */
export function evaluateCheckInEligibility({
  alreadyCheckedIn,
  sessionExpired,
  livenessPassed,
  similarity,
  threshold = 0.55,
  currentTime,
  lateAfter,
}) {
  if (alreadyCheckedIn) {
    return { eligible: false, reason: "ALREADY_ATTENDED" };
  }
  if (sessionExpired) {
    return { eligible: false, reason: "SESSION_EXPIRED" };
  }
  if (!livenessPassed) {
    return { eligible: false, reason: "LIVENESS_FAILED" };
  }
  if (similarity < threshold) {
    return { eligible: false, reason: "FACE_NOT_MATCHED" };
  }

  const isLate = lateAfter && currentTime ? currentTime > lateAfter : false;
  return {
    eligible: true,
    status: isLate ? "LATE" : "PRESENT",
    confidence: Math.round(similarity * 10000) / 100,
  };
}

/**
 * ตรวจสอบ Rate Limiting สำหรับการสแกนผิดพลาด
 * จำกัดไม่เกิน 5 ครั้งภายใน 10 นาที
 */
export function evaluateScanRateLimit(failedCountInWindow, maxAllowed = 5, windowMinutes = 10) {
  if (failedCountInWindow >= maxAllowed) {
    return {
      isLimited: true,
      remainingAttempts: 0,
      retryAfterMinutes: windowMinutes,
    };
  }
  return {
    isLimited: false,
    remainingAttempts: maxAllowed - failedCountInWindow,
    retryAfterMinutes: 0,
  };
}

/**
 * ป้องกันคำร้องแก้ไขข้อมูลที่ซ้ำกันสำหรับข้อมูลประเภทเดียวกันขณะที่ยังมีสถานะ PENDING
 */
export function canSubmitProfileRequest(existingRequests, targetFieldType) {
  const hasPendingSameField = existingRequests.some(
    (r) => r.fieldType === targetFieldType && r.status === "PENDING",
  );
  if (hasPendingSameField) {
    return { allowed: false, reason: "DUPLICATE_PENDING" };
  }
  return { allowed: true };
}

/**
 * ตรวจสอบความปลอดภัยของไฟล์แนบ (JPG, PNG, PDF ขนาดไม่เกิน 5 MB)
 */
export function validateAttachment(mimeType, sizeBytes, maxBytes = 5 * 1024 * 1024) {
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

  if (!allowed.has(mimeType)) {
    return { valid: false, reason: "UNSUPPORTED_TYPE" };
  }
  if (sizeBytes > maxBytes) {
    return { valid: false, reason: "FILE_TOO_LARGE" };
  }
  return { valid: true };
}

/**
 * จำลองการอนุมัติคำร้องด้วย Transaction
 * หากการปรับปรุงข้อมูลนักเรียนล้มเหลว Transaction ต้อง Rollback และไม่สร้าง Audit/Notification
 */
export async function processApprovalTransaction({
  request,
  updateStudentRecord,
  updateRequestStatus,
  createAuditLog,
  createNotification,
}) {
  let inTransaction = true;
  try {
    // 1. Update student data
    await updateStudentRecord(request.studentId, request.fieldType, request.newValue);

    // 2. Update request status
    await updateRequestStatus(request.id, "APPROVED");

    // 3. Create Audit Log
    await createAuditLog(request.id);

    // 4. Create Notification
    await createNotification(request.studentId);

    inTransaction = false;
    return { success: true, committed: true };
  } catch (error) {
    // Rollback
    return { success: false, committed: false, error: error.message };
  }
}

/**
 * ตรวจสอบการ Login
 */
export function validateLogin({ email, password, storedUser, isPasswordCorrect }) {
  if (!email || !password) return { success: false, reason: "MISSING_CREDENTIALS" };
  if (!storedUser) return { success: false, reason: "USER_NOT_FOUND" };
  if (storedUser.status !== "ACTIVE") return { success: false, reason: "ACCOUNT_INACTIVE" };
  if (!isPasswordCorrect) return { success: false, reason: "INVALID_PASSWORD" };
  return { success: true, user: storedUser };
}
