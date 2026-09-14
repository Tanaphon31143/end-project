import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getStudentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { faceSimilarity, isFaceEmbedding } from "@/lib/face-match";
import {
  checkScanRateLimit,
  hashIp,
  recordScanEvidence,
  recordScanAttempt,
} from "@/lib/face-security";
import { createNotification } from "@/lib/notifications";
import { getActiveSessionsForStudent } from "@/lib/student-check-in";
import {
  checkLivenessFailureLimit,
  verifyAndConsumeLivenessChallenge,
} from "@/lib/student-liveness";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const student = await getStudentSession();
  if (!student) {
    return Response.json({ message: "กรุณาเข้าสู่ระบบนักเรียน" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedSessionId = Number(url.searchParams.get("sessionId")) || undefined;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipH = hashIp(ip);

  const [rateLimit, sessions] = await Promise.all([
    checkScanRateLimit(student.id, ipH),
    getActiveSessionsForStudent(student.id, requestedSessionId),
  ]);

  return Response.json({
    sessions,
    session: sessions[0] || null, // fallback compatibility
    count: sessions.length,
    rateLimit,
  });
}

export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student) {
    return Response.json({ message: "กรุณาเข้าสู่ระบบนักเรียน" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipH = hashIp(ip);

  // 1. Server-side Rate limit check (max 5 failed attempts in 10 minutes)
  const rateLimit = await checkScanRateLimit(student.id, ipH);
  if (rateLimit.isLimited) {
    const minutes = Math.ceil(rateLimit.retryAfterSeconds / 60);
    await recordScanAttempt({
      userId: student.id,
      success: false,
      failureReason: "RATE_LIMITED",
      ipHash: ipH,
    });
    return Response.json(
      {
        message: `คุณสแกนผิดพลาดเกินกำหนด ระบบล็อกชั่วคราวเพื่อความปลอดภัย กรุณาลองใหม่อีกครั้งในอีก ${minutes} นาที`,
        code: "RATE_LIMITED",
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: unknown;
    embedding?: unknown;
    livenessToken?: unknown;
    livenessEvidence?: unknown;
    deviceInfo?: string;
  };

  const sessionId = Number(body.sessionId);
  const embedding = body.embedding;
  const deviceInfo = typeof body.deviceInfo === "string" ? body.deviceInfo : null;
  const livenessEvidence = Array.isArray(body.livenessEvidence)
    ? body.livenessEvidence.slice(0, 2).map((item) => {
        const value = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          challenge: typeof value.challenge === "string" ? value.challenge.slice(0, 30) : null,
          gestures: Array.isArray(value.gestures)
            ? value.gestures.filter((gesture): gesture is string => typeof gesture === "string").slice(0, 4)
            : [],
          real: typeof value.real === "number" ? value.real : null,
          live: typeof value.live === "number" ? value.live : null,
          capturedAt: typeof value.capturedAt === "number" ? value.capturedAt : null,
        };
      })
    : [];

  if (!Number.isInteger(sessionId) || sessionId < 1 || !isFaceEmbedding(embedding)) {
    const scanAttemptId = await recordScanAttempt({
      userId: student.id,
      attendanceSessionId: Number.isInteger(sessionId) ? sessionId : null,
      success: false,
      failureReason: "NO_FACE",
      ipHash: ipH,
      deviceInfo,
    });
    if (Number.isInteger(sessionId) && sessionId > 0) {
      await recordScanEvidence({
        scanAttemptId,
        userId: student.id,
        attendanceSessionId: sessionId,
        livenessResult: "NOT_ATTEMPTED",
        matchResult: "NO_FACE",
        evidence: livenessEvidence,
      });
    }
    return Response.json(
      { message: "ข้อมูลการสแกนไม่ถูกต้องหรือไม่พบใบหน้า", code: "NO_FACE" },
      { status: 400 },
    );
  }

  // 2. Strict Backend Session Validation (Does this session exist, match student classroom, active, not expired?)
  const activeSessions = await getActiveSessionsForStudent(student.id, sessionId);
  const session = activeSessions.find((s) => s.id === sessionId);

  if (!session) {
    const scanAttemptId = await recordScanAttempt({
      userId: student.id,
      attendanceSessionId: sessionId,
      success: false,
      failureReason: "SESSION_EXPIRED",
      ipHash: ipH,
      deviceInfo,
    });
    await recordScanEvidence({
      scanAttemptId,
      userId: student.id,
      attendanceSessionId: sessionId,
      livenessResult: "NOT_ATTEMPTED",
      matchResult: "SESSION_EXPIRED",
      evidence: livenessEvidence,
    });
    return Response.json(
      {
        message: "คาบเรียนนี้ปิดแล้ว หรือไม่ใช่วิชาที่เปิดในห้องเรียนของคุณ",
        code: "SESSION_EXPIRED",
      },
      { status: 409 },
    );
  }

  // 3. Server-issued, one-time interactive liveness challenge verification.
  const livenessLimit = await checkLivenessFailureLimit(student.id, sessionId);
  const liveness = livenessLimit.isLimited
    ? { valid: false, reason: "LIVENESS_LIMITED" }
    : await verifyAndConsumeLivenessChallenge({
        token: body.livenessToken,
        userId: student.id,
        sessionId,
        evidence: livenessEvidence,
      });
  if (!liveness.valid) {
    const scanAttemptId = await recordScanAttempt({
      userId: student.id,
      attendanceSessionId: sessionId,
      success: false,
      failureReason: "LIVENESS_FAILED",
      livenessResult: String(liveness.reason || "FAILED").slice(0, 50),
      ipHash: ipH,
      deviceInfo,
    });
    await recordScanEvidence({
      scanAttemptId,
      livenessChallengeId: liveness.challengeId,
      userId: student.id,
      attendanceSessionId: sessionId,
      livenessResult: String(liveness.reason || "FAILED"),
      evidence: livenessEvidence,
    });
    return Response.json(
      {
        message:
          liveness.reason === "LIVENESS_LIMITED"
            ? "ตรวจบุคคลจริงไม่ผ่านครบ 3 ครั้ง กรุณาติดต่อครูผู้สอน"
            : "การตรวจสอบบุคคลจริงไม่ผ่านหรือหมดเวลา กรุณาทำตามคำสั่งบนหน้าจอและลองใหม่",
        code: liveness.reason === "LIVENESS_LIMITED" ? "LIVENESS_LIMITED" : "LIVENESS_FAILED",
        remainingAttempts: Math.max(0, livenessLimit.remainingAttempts - 1),
      },
      { status: liveness.reason === "LIVENESS_LIMITED" ? 429 : 422 },
    );
  }

  // 4. Duplicate Check (Has student already checked in for this session?)
  const [existing] = await db.execute<
    (RowDataPacket & {
      id: number;
      checkInTime: string;
      status: string;
      confidence: number;
    })[]
  >(
    `SELECT id, TIME_FORMAT(check_in_time, '%H:%i:%s') checkInTime, status, confidence
     FROM attendance_records
     WHERE student_id = ? AND check_in_session_id = ?
     LIMIT 1`,
    [student.id, session.id],
  );

  if (existing[0]) {
    const scanAttemptId = await recordScanAttempt({
      userId: student.id,
      attendanceSessionId: sessionId,
      success: false,
      failureReason: "ALREADY_ATTENDED",
      ipHash: ipH,
      deviceInfo,
    });
    await recordScanEvidence({
      scanAttemptId,
      livenessChallengeId: liveness.challengeId,
      userId: student.id,
      attendanceSessionId: sessionId,
      livenessResult: "PASSED",
      livenessScore: liveness.score,
      matchResult: "ALREADY_ATTENDED",
      evidence: livenessEvidence,
    });
    return Response.json(
      {
        matched: true,
        alreadyCheckedIn: true,
        session,
        record: {
          ...existing[0],
          status: existing[0].status === "LATE" ? "สาย" : "มาเรียน",
        },
        message: "คุณเช็คชื่อในคาบนี้แล้ว",
        code: "ALREADY_ATTENDED",
      },
      { status: 409 },
    );
  }

  // 5. Fetch registered face samples
  const [samples] = await db.execute<
    (RowDataPacket & { embedding: string | number[] })[]
  >(
    `SELECT fs.embedding
     FROM face_samples fs
     JOIN face_data fd ON fd.student_id = fs.student_id AND fd.status = 'READY'
     WHERE fs.student_id = ?`,
    [student.id],
  );

  if (!samples.length) {
    const scanAttemptId = await recordScanAttempt({
      userId: student.id,
      attendanceSessionId: sessionId,
      success: false,
      failureReason: "PERMISSION_DENIED",
      ipHash: ipH,
      deviceInfo,
    });
    await recordScanEvidence({
      scanAttemptId,
      livenessChallengeId: liveness.challengeId,
      userId: student.id,
      attendanceSessionId: sessionId,
      livenessResult: "PASSED",
      livenessScore: liveness.score,
      matchResult: "FACE_NOT_REGISTERED",
      evidence: livenessEvidence,
    });
    return Response.json(
      {
        message: "ยังไม่ได้ลงทะเบียนข้อมูลใบหน้า หรือข้อมูลยังไม่เปิดใช้งาน",
        code: "FACE_NOT_REGISTERED",
      },
      { status: 422 },
    );
  }

  // 6. Compare face embeddings
  let best = 0;
  for (const sample of samples) {
    try {
      const stored =
        typeof sample.embedding === "string"
          ? JSON.parse(sample.embedding)
          : sample.embedding;
      if (isFaceEmbedding(stored)) {
        best = Math.max(best, faceSimilarity(embedding, stored));
      }
    } catch {
      continue;
    }
  }

  const [settingRows] = await db.execute<(RowDataPacket & { threshold: number })[]>(
    `SELECT face_match_threshold threshold FROM school_settings ORDER BY id LIMIT 1`,
  );
  const threshold = Number(settingRows[0]?.threshold || 0.55);
  const confidencePercent = Math.round(best * 10000) / 100;

  if (best < threshold) {
    const scanAttemptId = await recordScanAttempt({
      userId: student.id,
      attendanceSessionId: sessionId,
      success: false,
      failureReason: "FACE_NOT_MATCHED",
      livenessResult: "PASSED",
      matchResult: "MISMATCH",
      confidence: confidencePercent,
      ipHash: ipH,
      deviceInfo,
    });
    await recordScanEvidence({
      scanAttemptId,
      livenessChallengeId: liveness.challengeId,
      userId: student.id,
      attendanceSessionId: sessionId,
      livenessResult: "PASSED",
      livenessScore: liveness.score,
      matchResult: "MISMATCH",
      similarity: best,
      threshold,
      evidence: livenessEvidence,
    });

    const updatedLimit = await checkScanRateLimit(student.id, ipH);
    return Response.json(
      {
        matched: false,
        similarity: best,
        confidence: confidencePercent,
        threshold,
        remainingAttempts: updatedLimit.remainingAttempts,
        message: `ใบหน้าไม่ตรงกับข้อมูลที่ลงทะเบียน (ความคล้ายคลึง ${confidencePercent}%)`,
        code: "FACE_MISMATCH",
      },
      { status: 422 },
    );
  }

  // 7. Attendance Success: Determine Status (PRESENT vs LATE) and insert into attendance_records
  const [nowRows] = await db.execute<(RowDataPacket & { time: string })[]>(
    `SELECT TIME_FORMAT(CURRENT_TIME, '%H:%i:%s') time`,
  );
  const currentTime = nowRows[0].time;
  const isLate = currentTime > session.lateAfter;
  const attendanceStatus = isLate ? "LATE" : "PRESENT";

  try {
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO attendance_records (
        student_id, subject_id, check_in_session_id, attendance_date,
        check_in_time, status, confidence
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
      [
        student.id,
        session.subjectId,
        session.id,
        session.sessionDate,
        attendanceStatus,
        confidencePercent,
      ],
    );

    // Record success in scan_attempts
    const scanAttemptId = await recordScanAttempt({
      userId: student.id,
      attendanceSessionId: sessionId,
      success: true,
      livenessResult: "PASSED",
      matchResult: "MATCHED",
      confidence: confidencePercent,
      ipHash: ipH,
      deviceInfo,
    });
    await recordScanEvidence({
      scanAttemptId,
      livenessChallengeId: liveness.challengeId,
      userId: student.id,
      attendanceSessionId: sessionId,
      livenessResult: "PASSED",
      livenessScore: liveness.score,
      matchResult: "MATCHED",
      similarity: best,
      threshold,
      evidence: livenessEvidence,
    });

    // If marked LATE, send a student notification
    if (isLate) {
      await createNotification({
        userId: student.id,
        type: "ATTENDANCE_LATE",
        title: "แจ้งเตือนการมาสาย",
        message: `คุณเช็คชื่อวิชา ${session.subjectName} เวลา ${currentTime.slice(0, 5)} น. ซึ่งเกินเวลาที่กำหนด (${session.lateAfter.slice(0, 5)} น.)`,
        relatedEntityType: "attendance_record",
        relatedEntityId: result.insertId,
        actionUrl: `/student/attendance/history`,
      });
    }

    return Response.json(
      {
        matched: true,
        alreadyCheckedIn: false,
        similarity: best,
        confidence: confidencePercent,
        session,
        record: {
          id: result.insertId,
          checkInTime: currentTime.slice(0, 5),
          status: isLate ? "สาย" : "มาเรียน",
          confidence: confidencePercent,
        },
        message: isLate ? "เช็คชื่อสำเร็จ (สถานะ: สาย)" : "เช็คชื่อสำเร็จ (สถานะ: มาเรียน)",
      },
      { status: 201 },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      const scanAttemptId = await recordScanAttempt({
        userId: student.id,
        attendanceSessionId: sessionId,
        success: false,
        failureReason: "ALREADY_ATTENDED",
        ipHash: ipH,
        deviceInfo,
      });
      await recordScanEvidence({
        scanAttemptId,
        livenessChallengeId: liveness.challengeId,
        userId: student.id,
        attendanceSessionId: sessionId,
        livenessResult: "PASSED",
        livenessScore: liveness.score,
        matchResult: "ALREADY_ATTENDED",
        similarity: best,
        threshold,
        evidence: livenessEvidence,
      });
      return Response.json(
        {
          matched: true,
          alreadyCheckedIn: true,
          message: "คุณเช็คชื่อคาบนี้แล้ว",
          code: "ALREADY_ATTENDED",
        },
        { status: 409 },
      );
    }

    console.error("Student check-in failed", error);
    return Response.json({ message: "ไม่สามารถบันทึกการเช็คชื่อได้" }, { status: 500 });
  }
}
