import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import mysql from "mysql2/promise";

test("live portal schema and search queries work without changing school data", { skip: process.env.RUN_PORTAL_DB_TESTS !== "1" }, async () => {
  const url = new URL(process.env.DATABASE_URL);
  const connection = await mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } });
  try {
    function load(path) {
      const exports = {};
      const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
      vm.runInNewContext(code, { exports, require(name) { if (name === "server-only") return {}; if (name === "./db") return { db: connection }; throw Error(name); } });
      return exports;
    }
    const search = load("../src/lib/portal-search.ts");
    for (const role of ["admin", "teacher"]) {
      const results = await search.searchPortal({ id: 0, role }, "M%_!");
      assert.ok(Array.isArray(results));
      if (role === "teacher") assert.equal(results.length, 0);
    }
    assert.ok(Array.isArray(await load("../src/lib/announcements.ts").getAnnouncements()));
    const [columns] = await connection.execute("SHOW COLUMNS FROM auth_password_resets");
    assert.ok(columns.some((c) => c.Field === "token_hash"));
    assert.ok(columns.some((c) => c.Field === "used_at"));
  } finally { await connection.end(); }
});
