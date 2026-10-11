import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

test('student layout overrides the inherited login title without reading private data', () => {
  const source = fs.readFileSync(new URL('../src/app/student/layout.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('layout.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const statement = tree.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(tree) === 'metadata'));
  assert.ok(statement, 'student metadata must be exported');
  assert.ok(statement.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword));
  const declaration = statement.declarationList.declarations.find(node => node.name.getText(tree) === 'metadata');
  const metadata = vm.runInNewContext(`(${declaration.initializer.getText(tree)})`);
  assert.equal(metadata.title, 'ระบบสำหรับนักเรียน | School OS');
  assert.doesNotMatch(metadata.title, /เข้าสู่ระบบ/);
});
