import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const PASSED = Symbol("next");
const nextServer = { NextResponse: { json: (body, init) => Response.json(body, init), next: () => PASSED } };

function load(path, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, Map, Date, Math, process: { env: { NODE_ENV: "test" } }, globalThis: {},
    require(name) {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected import ${name}`);
    } });
  return exports;
}

const security = load("../src/lib/api-security.ts", { "next/server": nextServer });
const { proxy, config } = load("../src/proxy.ts", { "next/server": nextServer, "@/lib/api-security": security });

const call = (method, headers = {}) =>
  proxy(new Request("https://school.test/api/students", { method, headers: { host: "school.test", ...headers } }));

test("proxy only runs on API routes", () => {
  assert.equal(config.matcher, "/api/:path*");
});

test("cross-site mutations are rejected before reaching any route handler", async () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const byOrigin = await call(method, { origin: "https://evil.example" });
    assert.equal(byOrigin.status, 403, `${method} with foreign Origin`);
    const byFetchSite = await call(method, { "sec-fetch-site": "cross-site" });
    assert.equal(byFetchSite.status, 403, `${method} with Sec-Fetch-Site: cross-site`);
  }
});

test("same-origin mutations, header-less clients and reads pass through", () => {
  assert.equal(call("POST", { origin: "https://school.test", "sec-fetch-site": "same-origin" }), PASSED);
  assert.equal(call("DELETE"), PASSED);
  assert.equal(call("GET", { origin: "https://evil.example", "sec-fetch-site": "cross-site" }), PASSED);
});

test("forwarded host and protocol from the deployment edge are honoured", () => {
  assert.equal(call("PATCH", { origin: "https://portal.school.test", "x-forwarded-host": "portal.school.test", "x-forwarded-proto": "https" }), PASSED);
  assert.equal(call("PATCH", { origin: "http://portal.school.test", "x-forwarded-host": "portal.school.test", "x-forwarded-proto": "https" }).status, 403);
});
