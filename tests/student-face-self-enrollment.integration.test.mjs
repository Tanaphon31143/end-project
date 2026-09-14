import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import mysql from 'mysql2/promise';

const enabled = process.env.RUN_STUDENT_INTEGRATION === '1' && Boolean(process.env.AUTH_SECRET);
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
function cookie(role) {
  const payload = Buffer.from(JSON.stringify({ id: 1, role, name: 'Enrollment API test', exp: Date.now() + 60000 })).toString('base64url');
  return `school_os_session=${payload}.${createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('base64url')}`;
}

test('self-enrollment endpoints require a student session and reject enrollment without identity proof', { skip: !enabled }, async () => {
  for (const path of ['/api/student/face-enrollment', '/api/student/face-enrollment/challenge', '/api/student/face-enrollment/liveness', '/api/student/face-identity/start']) {
    for (const auth of ['', cookie('teacher'), cookie('admin')]) {
      const response = await fetch(base + path, { method: 'POST', headers: auth ? { cookie: auth } : undefined, body: new FormData() });
      assert.equal(response.status, 401, `${path} must reject non-students`);
    }
  }
  const forged = new FormData();
  forged.set('studentId', '999999');
  const invalid = await fetch(base + '/api/student/face-enrollment', { method: 'POST', headers: { cookie: cookie('student') }, body: forged });
  assert.equal(invalid.status, 403);
});

test('student without face data sees the self-enrollment action', { skip: !enabled || !process.env.DATABASE_URL }, async () => {
  const parsed = new URL(process.env.DATABASE_URL);
  const connection = await mysql.createConnection({
    host: parsed.hostname, port: Number(parsed.port || 3306), user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password), database: parsed.pathname.slice(1), ssl: { rejectUnauthorized: true },
  });
  let student;
  try {
    const [[row]] = await connection.query("SELECT s.id,s.email,s.full_name fullName FROM students s LEFT JOIN face_data fd ON fd.student_id=s.id WHERE s.status='ACTIVE' AND fd.id IS NULL LIMIT 1");
    student = row;
  } finally { await connection.end(); }
  assert.ok(student, 'test database requires one active student without face data');
  const payload = Buffer.from(JSON.stringify({ id: student.id, role: 'student', name: student.fullName, email: student.email, exp: Date.now() + 60000 })).toString('base64url');
  const signed = `school_os_session=${payload}.${createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('base64url')}`;
  const response = await fetch(base + '/student/face', { headers: { cookie: signed } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /ยืนยันตัวตนและลงทะเบียนใบหน้า/);
  const noConsent = await fetch(base + '/api/student/face-identity/start', {
    method: 'POST', headers: { cookie: signed, origin: new URL(base).origin, 'content-type': 'application/json' },
    body: JSON.stringify({ consent: false }),
  });
  assert.equal(noConsent.status, 400);
});
