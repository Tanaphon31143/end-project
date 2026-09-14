import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import mysql from "mysql2/promise";

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const enabled = process.env.RUN_STUDENT_INTEGRATION === "1"
  && Boolean(databaseUrl)
  && Boolean(process.env.AUTH_SECRET);
const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";

async function studentCookie() {
  const parsed = new URL(databaseUrl);
  const connection = await mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
  });
  try {
    const [[student]] = await connection.query(
      "SELECT id,full_name name,email FROM students WHERE status='ACTIVE' ORDER BY id LIMIT 1",
    );
    assert.ok(student, "ฐานทดสอบต้องมีนักเรียน ACTIVE อย่างน้อยหนึ่งคน");
    const payload = Buffer.from(JSON.stringify({
      id: student.id,
      role: "student",
      name: student.name,
      email: student.email,
      exp: Date.now() + 60_000,
    })).toString("base64url");
    const signature = createHmac("sha256", process.env.AUTH_SECRET)
      .update(payload)
      .digest("base64url");
    return { cookie: `school_os_session=${payload}.${signature}`, studentId: Number(student.id) };
  } finally {
    await connection.end();
  }
}

const gestureFor = {
  BLINK: "blink left eye",
  TURN_LEFT: "facing left",
  TURN_RIGHT: "facing right",
  LOOK_UP: "head up",
};

test("student check-in: challenge is one-time and its audit evidence is persisted", { skip: !enabled }, async () => {
  const parsed = new URL(databaseUrl);
  const connection = await mysql.createConnection({
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
    ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
  });
  let sessionId;
  try {
    const auth = await studentCookie();
    const [[subject]] = await connection.query(
      `SELECT sb.id subjectId, sb.classroom_id classroomId
       FROM subjects sb JOIN students st ON st.class_id = sb.classroom_id
       WHERE st.id = ? AND sb.is_active = 1 LIMIT 1`,
      [auth.studentId],
    );
    assert.ok(subject, "นักเรียนทดสอบต้องมีวิชา ACTIVE ในห้องของตน");
    const [session] = await connection.execute(
      `INSERT INTO check_in_sessions
        (subject_id, classroom_id, session_date, start_time, end_time, late_after, status)
       VALUES (?, ?, DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+07:00')),
               '00:00:00', '23:59:59', '23:59:59', 'ACTIVE')`,
      [subject.subjectId, subject.classroomId],
    );
    sessionId = Number(session.insertId);
    const headers = { cookie: auth.cookie, "content-type": "application/json" };

    const issued = await fetch(`${baseUrl}/api/student/liveness-challenge`, {
      method: "POST", headers, body: JSON.stringify({ sessionId }),
    });
    assert.equal(issued.status, 200);
    const challenge = await issued.json();
    assert.equal(challenge.challenges.length, 2);

    const capturedAt = Date.now();
    const livenessEvidence = challenge.challenges.map((kind, index) => ({
      challenge: kind,
      gestures: [gestureFor[kind]],
      real: 0.9,
      live: 0.9,
      capturedAt: capturedAt + index * 1_000,
    }));
    const payload = {
      sessionId,
      embedding: Array(128).fill(0),
      livenessToken: challenge.token,
      livenessEvidence,
    };
    const first = await fetch(`${baseUrl}/api/student/check-in`, {
      method: "POST", headers, body: JSON.stringify(payload),
    });
    assert.ok([201, 409, 422].includes(first.status), `unexpected status ${first.status}`);

    const replay = await fetch(`${baseUrl}/api/student/check-in`, {
      method: "POST", headers, body: JSON.stringify(payload),
    });
    assert.equal(replay.status, 422);
    assert.equal((await replay.json()).code, "LIVENESS_FAILED");

    const [[evidence]] = await connection.query(
      "SELECT liveness_result FROM student_scan_evidence WHERE user_id=? AND attendance_session_id=? ORDER BY id DESC LIMIT 1",
      [auth.studentId, sessionId],
    );
    assert.ok(evidence, "ต้องบันทึก scan evidence");
  } finally {
    if (sessionId) {
      await connection.execute("DELETE FROM student_scan_evidence WHERE attendance_session_id=?", [sessionId]);
      await connection.execute("DELETE FROM scan_attempts WHERE attendance_session_id=?", [sessionId]);
      await connection.execute("DELETE FROM student_liveness_challenges WHERE attendance_session_id=?", [sessionId]);
      await connection.execute("DELETE FROM attendance_records WHERE check_in_session_id=?", [sessionId]);
      await connection.execute("DELETE FROM check_in_sessions WHERE id=?", [sessionId]);
    }
    await connection.end();
  }
});
