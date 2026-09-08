import assert from "node:assert/strict";
import test from "node:test";
import mysql from "mysql2/promise";

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const enabled = process.env.RUN_TEACHER_INTEGRATION === "1" && Boolean(databaseUrl);

test("teacher workflow: สร้างรอบ ป้องกันสแกนซ้ำ ปิดรอบ และ RBAC", { skip: !enabled }, async () => {
  const parsed = new URL(databaseUrl);
  const connection = await mysql.createConnection({ host: parsed.hostname, port: Number(parsed.port || 3306), user: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), database: parsed.pathname.slice(1), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } });
  await connection.beginTransaction();
  try {
    const [[base]] = await connection.query(`SELECT sb.id subjectId,sb.teacher_id teacherId,sb.classroom_id classroomId,st.id studentId FROM subjects sb JOIN students st ON st.class_id=sb.classroom_id WHERE sb.is_active=1 AND st.status='ACTIVE' LIMIT 1`);
    assert.ok(base, "ฐานทดสอบต้องมีครู รายวิชา ห้อง และนักเรียนอย่างน้อยหนึ่งชุด");
    const sessionDate = "2099-12-30";
    const [session] = await connection.execute(`INSERT INTO check_in_sessions(subject_id,classroom_id,session_date,start_time,end_time,late_after,status,created_by_teacher_id) VALUES(?,?,?,'08:00','09:00','08:15','ACTIVE',?)`, [base.subjectId, base.classroomId, sessionDate, base.teacherId]);
    const sessionId = session.insertId;
    const [[owned]] = await connection.execute(`SELECT cis.id FROM check_in_sessions cis JOIN subjects sb ON sb.id=cis.subject_id WHERE cis.id=? AND sb.teacher_id=?`, [sessionId, base.teacherId]);
    assert.equal(Number(owned.id), Number(sessionId));
    const [[foreign]] = await connection.execute(`SELECT cis.id FROM check_in_sessions cis JOIN subjects sb ON sb.id=cis.subject_id WHERE cis.id=? AND sb.teacher_id=?`, [sessionId, Number(base.teacherId) + 999999]);
    assert.equal(foreign, undefined, "ครูอื่นต้องไม่เห็นรอบนี้");
    await connection.execute(`INSERT INTO attendance_records(student_id,subject_id,attendance_date,check_in_time,status,check_in_session_id) VALUES(?,?,?,NOW(),'PRESENT',?)`, [base.studentId, base.subjectId, sessionDate, sessionId]);
    await assert.rejects(() => connection.execute(`INSERT INTO attendance_records(student_id,subject_id,attendance_date,check_in_time,status,check_in_session_id) VALUES(?,?,?,NOW(),'PRESENT',?)`, [base.studentId, base.subjectId, sessionDate, sessionId]), /Duplicate entry|unique/i);
    await connection.execute(`UPDATE check_in_sessions SET status='CLOSED' WHERE id=? AND status='ACTIVE'`, [sessionId]);
    const [[closed]] = await connection.execute(`SELECT status FROM check_in_sessions WHERE id=?`, [sessionId]);
    assert.equal(closed.status, "CLOSED");
  } finally {
    await connection.rollback();
    await connection.end();
  }
});
