// Read-only measurement: never prints records, connection URLs or credentials.
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import mysql from "mysql2/promise";
const url = new URL(process.env.DATABASE_URL);
const pool = mysql.createPool({ host: url.hostname, port: Number(url.port || 3306),
  user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
  database: url.pathname.slice(1), ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }, connectionLimit: 10 });
let queryCount = 0;
const db = { async execute(sql, args) {
  if (!/^\s*SELECT\b/i.test(sql)) throw new Error("Only SELECT is permitted");
  queryCount++;
  return pool.execute(sql, args);
} };
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/admin-data.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, Date, Map, Set, console, require: name => name === "@/lib/db" ? { db } : {} });
try {
  await pool.execute("SELECT 1");
  for (const name of ["getCheckInPageData", "getReportData", "getFacePageData"]) {
    const samples = [];
    for (let i = 0; i < 3; i++) {
      queryCount = 0;
      const start = performance.now();
      await exports[name](...(name === "getCheckInPageData" ? [new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date())] : []));
      samples.push({ ms: Math.round(performance.now() - start), queries: queryCount });
    }
    console.log(JSON.stringify({ name, samples, medianMs: samples.map(x => x.ms).sort((a,b) => a-b)[1] }));
  }
} catch (error) {
  console.error("Read benchmark failed:", error.code || error.name);
  process.exitCode = 1;
} finally { await pool.end(); }
