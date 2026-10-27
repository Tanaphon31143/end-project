import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import mysql from "mysql2/promise";

const enabled = process.env.RUN_ACADEMIC_TERM_INTEGRATION === "1" && Boolean(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);

test("term 2 starts empty, reuses student identity and faces, and keeps term 1 attendance", { skip: !enabled }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database: url.pathname.slice(1),
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  await connection.beginTransaction();
  try {
    const [[student]] = await connection.execute(`SELECT s.id,s.class_id classroomId FROM students s JOIN classrooms c ON c.id=s.class_id
      WHERE s.status='ACTIVE' AND NOT EXISTS (SELECT 1 FROM student_term_enrollments e WHERE e.student_id=s.id AND e.academic_year='9999') LIMIT 1`);
    assert.ok(student, "a legacy student with a classroom is required");
    const fingerprint = async () => {
      const [[row]] = await connection.execute("SELECT SHA2(CONCAT_WS(':',id,email,student_code,password_hash),256) fingerprint FROM students WHERE id=?", [student.id]);
      const [[faces]] = await connection.execute("SELECT COUNT(*) total,COALESCE(SUM(image_count),0) images FROM face_data WHERE student_id=?", [student.id]);
      const [[samples]] = await connection.execute("SELECT COUNT(*) total FROM face_samples WHERE student_id=?", [student.id]);
      const [[bindings]] = await connection.execute("SELECT COUNT(*) total,COALESCE(BIT_XOR(CRC32(CONCAT_WS(':',google_sub,verified_email,face_data_id))),0) fingerprint FROM student_face_email_bindings WHERE student_id=?", [student.id]);
      return JSON.stringify({ row, faces, samples, bindings });
    };
    const identityBefore = await fingerprint();
    const code = `TERM-${randomUUID().slice(0, 12)}`;
    const [termOne] = await connection.execute("INSERT INTO subjects (subject_code,subject_name,classroom_id,academic_year,semester) VALUES (?,'Term isolation test',?,'9999',1)", [code, student.classroomId]);
    const [termTwo] = await connection.execute("INSERT INTO subjects (subject_code,subject_name,classroom_id,academic_year,semester) VALUES (?,'Term isolation test',?,'9999',2)", [code, student.classroomId]);
    await assert.rejects(() => connection.execute("INSERT INTO subjects (subject_code,subject_name,classroom_id,academic_year,semester) VALUES (?,'Duplicate same term',?,'9999',2)", [code, student.classroomId]), { code: "ER_DUP_ENTRY" });

    await connection.execute("INSERT INTO student_term_enrollments (student_id,classroom_id,academic_year,semester,class_number) VALUES (?,?,'9999',1,NULL)", [student.id, student.classroomId]);
    const roster = async (subjectId) => {
      const [rows] = await connection.execute(`SELECT st.id FROM students st JOIN student_term_enrollments e ON e.student_id=st.id
        JOIN subjects sb ON sb.classroom_id=e.classroom_id AND sb.academic_year=e.academic_year AND sb.semester=e.semester
        WHERE st.id=? AND sb.id=? AND st.status='ACTIVE'`, [student.id, subjectId]);
      return rows;
    };
    assert.equal((await roster(termOne.insertId)).length, 1);
    assert.equal((await roster(termTwo.insertId)).length, 0, "legacy class_id must not enroll a student into term 2");

    const [session] = await connection.execute("INSERT INTO check_in_sessions (subject_id,classroom_id,session_date,start_time,end_time,late_after,status) VALUES (?,?,'2099-12-30','08:00','09:00','08:15','CLOSED')", [termOne.insertId, student.classroomId]);
    await connection.execute("INSERT INTO attendance_records (student_id,subject_id,attendance_date,status,check_in_session_id) VALUES (?,?,'2099-12-30','PRESENT',?)", [student.id, termOne.insertId, session.insertId]);
    await connection.execute("INSERT INTO student_term_enrollments (student_id,classroom_id,academic_year,semester,class_number) VALUES (?,?,'9999',2,NULL)", [student.id, student.classroomId]);
    assert.equal((await roster(termTwo.insertId))[0].id, student.id, "both terms reuse the same account ID");
    assert.equal((await roster(termOne.insertId)).length, 1);
    const [[history]] = await connection.execute("SELECT COUNT(*) total FROM attendance_records a JOIN subjects sb ON sb.id=a.subject_id WHERE a.student_id=? AND sb.academic_year='9999' AND sb.semester=1", [student.id]);
    assert.equal(Number(history.total), 1);
    assert.equal(await fingerprint(), identityBefore, "email, password, face samples and verified email binding must remain unchanged");
  } finally {
    await connection.rollback();
    await connection.end();
  }
});
