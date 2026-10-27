import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { createRequire } from "node:module";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL("../src/components/admin/users/AccountPresence.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, require, Set });

test("presence maps role and ID together and never enables a suspended account", () => {
  const records = [
    { databaseId: 7, role: "teacher", status: "ACTIVE", isLoggedIn: 0 },
    { databaseId: 7, role: "student", status: "ACTIVE", isLoggedIn: 1 },
    { databaseId: 8, role: "teacher", status: "INACTIVE", isLoggedIn: 1 },
  ];
  const result = api.mergeAccountPresence(records, new Set(["teacher:7", "teacher:8"]));
  assert.deepEqual(Array.from(result, account => account.isLoggedIn), [true, false, false]);
  assert.equal(records[0].isLoggedIn, 0);
  assert.equal(result[2].status, "INACTIVE");
});

test("an empty fresh snapshot logs accounts out while initial data remains usable before refresh", () => {
  const records = [{ databaseId: 7, status: "ACTIVE", isLoggedIn: 1 }];
  assert.equal(api.mergeAccountPresence(records, null, "teacher")[0].isLoggedIn, true);
  assert.equal(api.mergeAccountPresence(records, new Set(), "teacher")[0].isLoggedIn, false);
  assert.equal(api.mergeAccountPresence(records, new Set(["student:7"]), "teacher")[0].isLoggedIn, false);
});

test("login badges and exports use the exact requested labels with a distinct logged-out treatment", () => {
  for (const loggedIn of [true, false]) {
    const markup = renderToStaticMarkup(React.createElement(api.AccountPresenceBadge, { isLoggedIn: loggedIn }));
    assert.ok(markup.includes(api.loginStatusLabel(loggedIn)));
    assert.equal(markup.includes("logged-out"), !loggedIn);
  }
  assert.equal(api.loginStatusLabel(true), "กำลังใช้งาน");
  assert.equal(api.loginStatusLabel(false), "ออกจากระบบแล้ว");
});

test("a refresh failure explains that the displayed status is the last known state and offers retry", () => {
  const props = { onRetry: async () => {}, isStale: false };
  assert.equal(renderToStaticMarkup(React.createElement(api.AccountPresenceNotice, props)), "");
  const markup = renderToStaticMarkup(React.createElement(api.AccountPresenceNotice, { ...props, isStale: true }));
  assert.match(markup, /กำลังแสดงสถานะล่าสุด/);
  assert.match(markup, /ลองอีกครั้ง/);
  assert.match(markup, /role="status"/);
});
