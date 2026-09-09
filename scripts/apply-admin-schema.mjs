import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const parsedUrl = new URL(databaseUrl);
const schema = await readFile(
  new URL("../database/admin_schema.sql", import.meta.url),
  "utf8",
);

const connection = await mysql.createConnection({
  host: parsedUrl.hostname,
  port: Number(parsedUrl.port || 3306),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: parsedUrl.pathname.replace(/^\//, ""),
  ssl: {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
  },
  multipleStatements: true,
});

try {
  await connection.query(schema);
  console.log("Admin database schema is up to date.");
} finally {
  await connection.end();
}
