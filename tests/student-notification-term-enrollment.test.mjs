import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// A "?" inside a quoted SQL literal (for example a URL query string) is not a bind placeholder.
function countPlaceholders(sql) {
  return (sql.replace(/'(?:[^'\\]|\\.)*'/g, "''").match(/\?/g) || []).length;
}

function loadNotificationSync() {
  const exports = {};
  let execution;
  const source = fs.readFileSync(
    new URL("../src/lib/student-notification-events.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  vm.runInNewContext(compiled, {
    exports,
    process: { env: { NODE_ENV: "production" } },
    require(name) {
      if (name === "server-only") return {};
      assert.equal(name, "./db");
      return {
        db: {
          async execute(sql, values) {
            execution = { sql, values: Array.from(values) };
            const placeholderCount = countPlaceholders(sql);
            assert.equal(
              execution.values.length,
              placeholderCount,
              "notification query must bind one value for every placeholder",
            );
            return [[]];
          },
        },
      };
    },
  });

  return {
    sync: exports.syncStudentNotificationEvents,
    getExecution: () => execution,
  };
}

test("notification materialization binds every student scope placeholder", async () => {
  const studentId = 42;
  const api = loadNotificationSync();

  await api.sync(studentId);

  const { sql, values } = api.getExecution();
  assert.equal(countPlaceholders(sql), 8);
  assert.deepEqual(values, Array(8).fill(studentId));
  assert.match(sql, /JOIN student_term_enrollments ste/);
});
