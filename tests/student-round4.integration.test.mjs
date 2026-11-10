import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { connectTestDatabase, createTestSession, firstActiveAccount } from './helpers/session.mjs';

const enabled = process.env.RUN_STUDENT_INTEGRATION === '1' && Boolean(process.env.AUTH_SECRET) && Boolean(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
/** Signed but expired: rejected before any database lookup, so it needs no session row. */
function expiredStudentCookie() {
  const payload = Buffer.from(JSON.stringify({ id: 1, role: 'student', name: 'API guard test', sessionId: 'x'.repeat(43), exp: Date.now() - 10000 })).toString('base64url');
  return `school_os_session=${payload}.${createHmac('sha256', process.env.AUTH_SECRET).update(payload).digest('base64url')}`;
}
const endpoints = [
  ['GET', '/api/student/notifications'], ['PATCH', '/api/student/notifications'],
  ['PATCH', '/api/student/profile'], ['POST', '/api/student/profile'],
  ['GET', '/api/student/profile-image'], ['GET', '/api/student/face-image'],
  ['GET', '/api/student/profile-requests'], ['POST', '/api/student/profile-requests'],
  ['POST', '/api/student/reports'], ['GET', '/api/student/reports/1/attachments'],
  ['POST', '/api/student/check-in'], ['POST', '/api/student/liveness-challenge'],
];

/** Runs `use` with live sessions for the given accounts, then removes them. */
async function withSessions(roles, use) {
  const connection = await connectTestDatabase();
  const sessions = [];
  try {
    const cookies = {};
    for (const role of roles) {
      const account = await firstActiveAccount(connection, role, role === 'student' ? 'a.must_change_password=0' : '');
      assert.ok(account, `ต้องมีบัญชี ${role} สำหรับทดสอบ`);
      const session = await createTestSession(connection, account);
      sessions.push(session);
      cookies[role] = session.cookie;
    }
    return await use(cookies);
  } finally {
    for (const session of sessions) await session.revoke();
    await connection.end();
  }
}

test('student API authentication matrix rejects anonymous, invalid, expired and other-role sessions', { skip: !enabled, timeout: 120000 }, async () => {
  await withSessions(['teacher', 'admin'], async ({ teacher, admin }) => {
    const cookies = ['', 'school_os_session=invalid.signature', expiredStudentCookie(), teacher, admin];
    for (const [method, path] of endpoints) {
      for (const auth of cookies) {
        const response = await fetch(base + path, { method, headers: { cookie: auth, 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: '{}' }), signal: AbortSignal.timeout(20000) });
        assert.equal(response.status, 401, `${method} ${path} must deny invalid sessions`);
        await response.arrayBuffer();
      }
    }
  });
});

test('notification API returns 400 for malformed pagination and commands before database writes', { skip: !enabled, timeout: 30000 }, async () => {
  await withSessions(['student'], async ({ student }) => {
    const headers = { cookie: student, 'Content-Type': 'application/json' };
    for (const query of ['page=0', 'page=abc', 'limit=0', 'limit=101']) {
      const response = await fetch(`${base}/api/student/notifications?${query}`, { headers });
      assert.equal(response.status, 400, query);
      await response.arrayBuffer();
    }
    for (const body of ['null', '[]', '{}', '{', '{"id":true}', '{"markAll":true,"id":1}']) {
      const response = await fetch(`${base}/api/student/notifications`, { method: 'PATCH', headers, body });
      assert.equal(response.status, 400, body);
      await response.arrayBuffer();
    }
  });
});
