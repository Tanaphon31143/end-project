import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
const url = new URL(databaseUrl);
const checkOnly = process.argv.includes("--check") || process.argv.includes("--dry-run");
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
});

try {
  const [columnRows] = await connection.execute("SHOW FULL COLUMNS FROM school_announcements");
  const columns = new Map(columnRows.map((column) => [String(column.Field), String(column.Type)]));
  const titleColumn = columnRows.find((column) => column.Field === "title");
  const titleType = titleColumn?.Type;
  const titleLength = /^varchar\s*\(\s*(\d+)\s*\)/i.exec(titleType ?? "")?.[1];
  if (!titleType || titleLength === undefined) {
    throw new Error("school_announcements.title must be a VARCHAR column");
  }
  const [indexRows] = await connection.execute(
    "SHOW INDEX FROM school_announcements WHERE Key_name='idx_school_announcements_publish_at'",
  );
  const [attachmentTableRows] = await connection.execute(
    "SHOW TABLES LIKE 'school_announcement_attachments'",
  );
  const current = {
    titleType,
    titleCollation: titleColumn.Collation,
    titleNullable: titleColumn.Null === "YES",
    publishAt: columns.has("publish_at"),
    schedulingIndex: indexRows.length > 0,
    attachmentTable: attachmentTableRows.length > 0,
  };

  const changes = [];
  if (Number(titleLength) < 200) changes.push("Widen school_announcements.title to VARCHAR(200)");
  if (!columns.has("publish_at")) changes.push("Add nullable publish_at DATETIME(3)");
  if (!indexRows.length) changes.push("Add index on (is_published,publish_at,created_at)");
  if (!attachmentTableRows.length) changes.push("Create school_announcement_attachments with MEDIUMBLOB storage and cascade FK");

  if (checkOnly) {
    console.log(JSON.stringify({ mode: "check", ready: changes.length === 0, current, changes }, null, 2));
  } else {
    if (Number(titleLength) < 200) {
      const collation = String(titleColumn.Collation ?? "");
      const characterSet = collation.split("_")[0];
      if (!/^[a-zA-Z0-9_]+$/.test(collation) || !/^[a-zA-Z0-9_]+$/.test(characterSet)) {
        throw new Error("school_announcements.title collation could not be preserved safely");
      }
      const nullability = titleColumn.Null === "YES" ? "NULL" : "NOT NULL";
      const defaultClause = titleColumn.Default === null || titleColumn.Default === undefined
        ? ""
        : ` DEFAULT ${connection.escape(titleColumn.Default)}`;
      const commentClause = titleColumn.Comment
        ? ` COMMENT ${connection.escape(titleColumn.Comment)}`
        : "";
      await connection.execute(
        `ALTER TABLE school_announcements MODIFY COLUMN title VARCHAR(200) CHARACTER SET ${characterSet} COLLATE ${collation} ${nullability}${defaultClause}${commentClause}`,
      );
    }
    if (!columns.has("publish_at")) {
      await connection.execute(
        "ALTER TABLE school_announcements ADD COLUMN publish_at DATETIME(3) NULL AFTER is_published",
      );
    }
    if (!indexRows.length) {
      await connection.execute(
        "ALTER TABLE school_announcements ADD INDEX idx_school_announcements_publish_at (is_published,publish_at,created_at)",
      );
    }
    if (!attachmentTableRows.length) {
      const sql = await readFile(
        new URL("../database/migrations/20261016_school_announcements_up.sql", import.meta.url),
        "utf8",
      );
      const createTable = sql.match(
        /CREATE TABLE IF NOT EXISTS school_announcement_attachments \([\s\S]*?\n\);/,
      )?.[0];
      if (!createTable) throw new Error("Attachment table migration could not be read");
      await connection.query(createTable);
    }
    console.log("School announcement schema is ready");
  }
} finally {
  await connection.end();
}

