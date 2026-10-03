import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not configured");
const parsed = new URL(url);
const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
  multipleStatements: true,
});
try {
  const sql = await readFile(new URL("../database/migrations/20260915_teacher_subject_requests.sql", import.meta.url), "utf8");
  await connection.query(sql);
  console.log("Teacher subject requests table is ready");
} finally {
  await connection.end();
}
