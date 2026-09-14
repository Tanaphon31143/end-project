import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

const enabled = process.env.RUN_STUDENT_INTEGRATION === '1';
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
function cookie(role, exp = Date.now() + 300000) {
  const payload = Buffer.from(JSON.stringify({ id: 1, role, name: 'API guard test', exp })).toString('base64url');
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

test('student API authentication matrix rejects anonymous, invalid, expired and other-role sessions', { skip: !enabled, timeout: 120000 }, async () => {
  assert.ok(process.env.AUTH_SECRET, 'AUTH_SECRET is required');
  const cookies = ['', 'school_os_session=invalid.signature', cookie('student', Date.now() - 10000), cookie('teacher'), cookie('admin')];
  for (const [method, path] of endpoints) {
    for (const auth of cookies) {
      const response = await fetch(base + path, { method, headers: { cookie: auth, 'Content-Type': 'application/json' }, ...(method === 'GET' ? {} : { body: '{}' }), signal: AbortSignal.timeout(20000) });
      assert.equal(response.status, 401, `${method} ${path} must deny invalid sessions`);
      await response.arrayBuffer();
    }
  }
});

test('notification API returns 400 for malformed pagination and commands before database writes', { skip: !enabled, timeout: 30000 }, async () => {
  assert.ok(process.env.AUTH_SECRET);
  const headers = { cookie: cookie('student'), 'Content-Type': 'application/json' };
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
