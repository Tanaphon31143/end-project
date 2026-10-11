import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
const url = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }, multipleStatements: true });
try {
  await connection.query(await readFile(new URL("../database/migrations/20261005_portal_features_up.sql", import.meta.url), "utf8"));
  console.log("Portal feature tables are ready");
} finally { await connection.end(); }
