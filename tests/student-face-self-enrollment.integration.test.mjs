import assert from 'node:assert/strict';
import test from 'node:test';
import { connectTestDatabase, createTestSession, firstActiveAccount } from './helpers/session.mjs';

const enabled = process.env.RUN_STUDENT_INTEGRATION === '1' && Boolean(process.env.AUTH_SECRET) && Boolean(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';

test('self-enrollment endpoints require a student session and reject enrollment without identity proof', { skip: !enabled }, async () => {
  const connection = await connectTestDatabase();
  const sessions = [];
  try {
    for (const role of ['teacher', 'admin', 'student']) {
      const account = await firstActiveAccount(connection, role, role === 'student' ? 'a.must_change_password=0' : '');
      assert.ok(account, `ต้องมีบัญชี ${role} สำหรับทดสอบ`);
      sessions.push({ role, ...(await createTestSession(connection, account)) });
    }
    const cookieOf = (role) => sessions.find((session) => session.role === role).cookie;
    for (const path of ['/api/student/face-enrollment', '/api/student/face-enrollment/challenge', '/api/student/face-enrollment/liveness', '/api/student/face-identity/start']) {
      for (const auth of ['', cookieOf('teacher'), cookieOf('admin')]) {
        const response = await fetch(base + path, { method: 'POST', headers: auth ? { cookie: auth } : undefined, body: new FormData() });
        assert.equal(response.status, 401, `${path} must reject non-students`);
      }
    }
    const forged = new FormData();
    forged.set('studentId', '999999');
    const invalid = await fetch(base + '/api/student/face-enrollment', { method: 'POST', headers: { cookie: cookieOf('student') }, body: forged });
    assert.equal(invalid.status, 403);
  } finally {
    for (const session of sessions) await session.revoke();
    await connection.end();
  }
});

test('student without face data sees the self-enrollment action', { skip: !enabled }, async () => {
  const connection = await connectTestDatabase();
  let session;
  try {
    const [[student]] = await connection.query("SELECT s.id,s.email,s.full_name name FROM students s LEFT JOIN face_data fd ON fd.student_id=s.id WHERE s.status='ACTIVE' AND s.must_change_password=0 AND fd.id IS NULL LIMIT 1");
    assert.ok(student, 'test database requires one active student without face data');
    session = await createTestSession(connection, { ...student, role: 'student' });
    const response = await fetch(base + '/student/face', { headers: { cookie: session.cookie }, redirect: 'manual' });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /ยืนยันตัวตนและลงทะเบียนใบหน้า/);
    const noConsent = await fetch(base + '/api/student/face-identity/start', {
      method: 'POST', headers: { cookie: session.cookie, origin: new URL(base).origin, 'content-type': 'application/json' },
      body: JSON.stringify({ consent: false }),
    });
    assert.equal(noConsent.status, 400);
  } finally {
    await session?.revoke();
    await connection.end();
  }
});
