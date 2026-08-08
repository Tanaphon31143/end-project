import "server-only";
import mysql, { type Pool } from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const parsedUrl = new URL(databaseUrl);

const globalForDatabase = globalThis as typeof globalThis & {
  mysqlPool?: Pool;
};

export const db =
  globalForDatabase.mysqlPool ??
  mysql.createPool({
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 3306),
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database: parsedUrl.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: true },
    connectionLimit: 10,
    enableKeepAlive: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.mysqlPool = db;
}
