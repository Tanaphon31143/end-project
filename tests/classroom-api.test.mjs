import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function fixture({ execute = async () => [{ affectedRows: 1 }], authorized = true } = {}) {
  const calls = [], audits = [], exports = {};
  const source = fs.readFileSync(new URL('../src/app/api/classes/route.ts', import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports, Response, Request, URL, require(name) {
      return ({ '@/lib/auth': { getAdminSession: async () => authorized ? { id: 1 } : null },
        '@/lib/db': { db: { execute: async (...args) => { calls.push(args); return execute(...args); } } },
        '@/lib/admin-audit': { recordAdminAudit: async (...args) => audits.push(args) },
        '@/lib/admin-data': { getClassroomPageData: async () => ({ classrooms: [] }) } })[name];
    } });
  return { api: exports, calls, audits };
}
const payload = { id: 99, className: 'TEST', gradeLevel: 'ม.5', roomNumber: 99, advisorTeacherId: 1, academicYear: '2599', semester: 1, isActive: false };
const req = (method, body) => new Request('https://example.test/api/classes', { method, headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('classroom malformed JSON and null return 400 without database writes', async () => {
  for (const method of ['POST', 'PUT']) for (const body of ['{', 'null', '[]']) {
    const { api, calls } = fixture();
    assert.equal((await api[method](req(method, body))).status, 400);
    assert.equal(calls.length, 0);
  }
});
test('classroom invalid update/delete IDs cannot reach the database', async () => {
  for (const id of [0, -1, 1.5, 'bad', null]) {
    const { api, calls } = fixture();
    assert.equal((await api.PUT(req('PUT', { ...payload, id }))).status, 400);
    assert.equal((await api.DELETE(new Request(`https://example.test/api/classes?id=${id}`, { method: 'DELETE' }))).status, 400);
    assert.equal(calls.length, 0);
  }
});
test('classroom deletion of missing row returns 404 and does not audit success', async () => {
  const { api, audits } = fixture({ execute: async (sql) => sql.startsWith('SELECT') ? [[{ total: 0 }]] : [{ affectedRows: 0 }] });
  assert.equal((await api.DELETE(new Request('https://example.test/api/classes?id=99', { method: 'DELETE' }))).status, 404);
  assert.equal(audits.length, 0);
});
test('classroom update distinguishes duplicate, database outage and referenced advisor errors', async () => {
  for (const [code, status] of [['ER_DUP_ENTRY', 409], ['ECONNRESET', 500], ['ER_NO_REFERENCED_ROW_2', 400]]) {
    const { api, audits } = fixture({ execute: async () => { throw { code }; } });
    assert.equal((await api.PUT(req('PUT', payload))).status, status);
    assert.equal(audits.length, 0);
  }
});
test('classroom deletion protects occupied rooms and reports referenced schedules', async () => {
  const request = () => new Request('https://example.test/api/classes?id=99', { method: 'DELETE' });
  const occupied = fixture({ execute: async () => [[{ total: 2 }]] });
  assert.equal((await occupied.api.DELETE(request())).status, 409);
  assert.equal(occupied.calls.length, 1);
  const referenced = fixture({ execute: async (sql) => { if (sql.startsWith('SELECT')) return [[{ total: 0 }]]; throw { code: 'ER_ROW_IS_REFERENCED_2' }; } });
  assert.equal((await referenced.api.DELETE(request())).status, 409);
});
