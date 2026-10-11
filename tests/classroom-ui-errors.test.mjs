import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/components/admin/classes/ClassesManager.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ClassesManager.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const functions = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && ['remove', 'reload'].includes(node.name?.text)) functions.push(node.getText(tree));
  ts.forEachChild(node, visit);
}
visit(tree);
assert.equal(functions.length, 2);
function fixture(fetch, confirmed = true) {
  const errors = [], successes = [], busyStates = [];
  let rooms = [{ id: 1 }, { id: 2 }];
  const exports = {};
  const context = { exports, Error, fetch, busy: false, setMenu() {},
    confirmDanger: async () => confirmed,
    showActionError: async message => errors.push(message),
    showActionSuccess: async message => successes.push(message),
    setBusy: state => busyStates.push(state),
    setClasses: value => { rooms = typeof value === 'function' ? value(rooms) : value; } };
  vm.runInNewContext(ts.transpileModule(`${functions.join('\n')}\nexport { remove };`,
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { remove: () => exports.remove({ id: 1, name: 'TEST' }), errors, successes, busyStates, rooms: () => rooms };
}
test('classroom rejected delete shows visible error instead of hidden form error', async () => {
  const f = fixture(async () => Response.json({ message: 'ห้องนี้มีนักเรียนอยู่' }, { status: 409 }));
  await f.remove(); assert.deepEqual(f.errors, ['ห้องนี้มีนักเรียนอยู่']);
  assert.equal(f.rooms().length, 2); assert.equal(f.successes.length, 0);
  assert.deepEqual(f.busyStates, [true, false]);
});
test('classroom network failure is caught and clears pending state', async () => {
  const f = fixture(async () => { throw new Error('network disconnected'); });
  await f.remove(); assert.equal(f.errors.length, 1); assert.deepEqual(f.busyStates, [true, false]);
});
test('classroom non-JSON server error still gives a readable alert', async () => {
  const f = fixture(async () => new Response('upstream unavailable', { status: 502 }));
  await f.remove(); assert.match(f.errors[0], /ลบห้องเรียนไม่สำเร็จ/);
});
test('classroom deletion success plus refresh failure does not resurrect deleted row', async () => {
  let calls = 0;
  const f = fixture(async () => ++calls === 1 ? Response.json({ message: 'deleted' }) : Response.json({ message: 'expired' }, { status: 401 }));
  await f.remove(); assert.equal(f.rooms().length, 1); assert.equal(f.rooms()[0].id, 2);
  assert.match(f.errors[0], /ลบห้องเรียนแล้ว/); assert.equal(f.successes.length, 0);
});
test('classroom successful delete refreshes list; cancelling never sends a request', async () => {
  let calls = 0;
  const fetch = async () => ++calls === 1 ? Response.json({ message: 'deleted' }) : Response.json({ classrooms: [{ id: 2 }] });
  const f = fixture(fetch); await f.remove(); assert.deepEqual(f.successes, ['deleted']); assert.equal(f.errors.length, 0);
  const cancelled = fixture(fetch, false); await cancelled.remove(); assert.equal(calls, 2); assert.equal(cancelled.busyStates.length, 0);
});
