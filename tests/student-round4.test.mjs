import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationPagination, notificationReadCommand } from '../src/lib/student-notification-rules.mjs';

test('notification pagination defaults and bounds', () => {
  assert.deepEqual(notificationPagination(new URLSearchParams()), { limit: 20, page: 1 });
  assert.deepEqual(notificationPagination(new URLSearchParams('limit=100&page=100000')), { limit: 100, page: 100000 });
  for (const query of ['limit=0', 'page=0', 'limit=', 'page=abc', 'page=-1', 'page=1.5', 'limit=101', 'page=100001', 'page=Infinity'])
    assert.equal(notificationPagination(new URLSearchParams(query)), null, query);
});

test('notification read rejects malformed commands without accidentally reading all', () => {
  for (const value of [null, [], {}, false, 'all', { id: true }, { id: 0 }, { id: -1 }, { id: 1.2 }, { id: '' }, { markAll: 'true' }, { markAll: true, id: 1 }])
    assert.equal(notificationReadCommand(value), null, JSON.stringify(value));
  assert.deepEqual(notificationReadCommand({ id: '12' }), { all: false, id: 12 });
  assert.deepEqual(notificationReadCommand({ markAll: true }), { all: true });
});
