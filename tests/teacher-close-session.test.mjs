import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual route handler without modifying attendance in the live DB.
function fixture({ closed = false, foreign = false, fail = false } = {}) {
  const state = { status: closed ? 'CLOSED' : 'ACTIVE', records: [{ id: 1n, studentId: 1, status: 'LEAVE' }], logs: [], notifications: 0, bulkCalls: 0 };
  const session = { id: 90001n, subjectId: 1, classroomId: 1, sessionDate: new Date('2026-09-11'), subject: { subjectCode: 'TEST' } };
  const prisma = {
    checkInSession: { findFirst: async ({ where }) => { assert.equal(where.subject.teacherId, 7); return foreign ? null : { ...session, status: state.status }; } },
    student: { findMany: async () => Array.from({ length: 40 }, (_, index) => ({ id: index + 1 })) },
    $transaction: async (callback, options) => {
      assert.equal(options.timeout, 30000);
      const original = structuredClone(state);
      try {
        return await callback({
          checkInSession: { updateMany: async () => { if (state.status === 'CLOSED') return { count: 0 }; state.status = 'CLOSED'; return { count: 1 }; } },
          attendanceRecord: {
            findMany: async ({ where }) => state.records.filter((row) => where.studentId.in.includes(row.studentId)),
            createMany: async ({ data }) => { state.bulkCalls++; state.records.push(...data.map((row, index) => ({ ...row, id: BigInt(index + 2) }))); },
          },
          auditLog: {
            createMany: async ({ data }) => { if (fail) throw new Error('database timeout'); state.logs.push(...data); },
            create: async ({ data }) => state.logs.push(data),
          },
          $executeRaw: async () => { state.notifications++; },
        });
      } catch (error) { Object.assign(state, original); throw error; }
    },
  };
  const imports = {
    'next/server': { NextResponse: Response },
    '@/lib/api-auth': { requireTeacher: async () => ({ teacher: { id: 7 } }), requestMeta: () => ({}) },
    '@/lib/db': { db: {} },
    '@/lib/prisma': { prisma },
    '@/lib/api-security': { protectTeacherMutation: () => null },
  };
  const source = fs.readFileSync(new URL('../src/app/api/teacher/sessions/route.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: (name) => { assert.ok(imports[name], name); return imports[name]; }, console: { error() {} } };
  vm.runInNewContext(output, context);
  const close = (body = '{"sessionId":"90001"}') => context.exports.PATCH(new Request('http://localhost:3000/api/teacher/sessions', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body }));
  return { state, close };
}

test('close a 40-student session in bulk, preserve leave, audit each absence, and retry safely', async () => {
  const { state, close } = fixture();
  const response = await close();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).absentCreated, 39);
  assert.equal(state.status, 'CLOSED');
  assert.equal(state.bulkCalls, 1);
  assert.equal(state.records.length, 40);
  assert.equal(state.records[0].status, 'LEAVE');
  assert.equal(state.logs.filter((log) => log.action === 'CREATE').length, 39);
  assert.equal(state.notifications, 1);
  const retry = await close();
  assert.equal((await retry.json()).alreadyClosed, true);
  assert.equal(state.logs.length, 40);
  assert.equal(state.notifications, 1);
});

test('database failure returns JSON and rolls back the close and absences', async () => {
  const { state, close } = fixture({ fail: true });
  const response = await close();
  assert.equal(response.status, 500);
  assert.ok((await response.json()).message);
  assert.equal(state.status, 'ACTIVE');
  assert.equal(state.records.length, 1);
  assert.equal(state.logs.length, 0);
});

test('foreign sessions and malformed JSON do not write data', async () => {
  const { state, close } = fixture({ foreign: true });
  assert.equal((await close()).status, 404);
  for (const body of ['{', 'null', '{}', '{"sessionId":"-1"}']) {
    const response = await close(body);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).message);
  }
  assert.equal(state.bulkCalls, 0);
});
