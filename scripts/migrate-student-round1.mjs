import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");

const parsedUrl = new URL(databaseUrl);
const connection = await mysql.createConnection({
  host: parsedUrl.hostname,
  port: Number(parsedUrl.port || 4000),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: parsedUrl.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" },
  multipleStatements: true,
});
try {
  const sql = await readFile(new URL("../database/migrations/20260909_student_round1_up.sql", import.meta.url), "utf8");
  await connection.query(sql);
  console.log("Student Round 1 migration applied.");
} finally {
  await connection.end();
}
