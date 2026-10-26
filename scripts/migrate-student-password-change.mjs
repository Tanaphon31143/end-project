import mysql from "mysql2/promise";
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Must match DEFAULT_IMPORTED_STUDENT_PASSWORD in src/lib/student-password-policy.ts.
const DEFAULT_IMPORTED_STUDENT_PASSWORD = "student@123";
const scryptAsync = promisify(scrypt);

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

// Same format as src/lib/password.ts: "<hex salt>:<128 hex chars of scrypt output>".
async function isDefaultPassword(stored) {
  const [salt, expected] = String(stored).split(":");
  if (!salt || !expected || !/^[0-9a-f]{128}$/i.test(expected)) return false;
  const actual = await scryptAsync(DEFAULT_IMPORTED_STUDENT_PASSWORD, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

async function studentsOnDefaultPassword(alreadyFlagged) {
  const [rows] = await connection.execute(
    alreadyFlagged
      ? "SELECT id,password_hash passwordHash FROM students WHERE must_change_password=0"
      : "SELECT id,password_hash passwordHash FROM students",
  );
  const matches = [];
  // scrypt is deliberately slow; check a few hashes at a time instead of all at once.
  for (let index = 0; index < rows.length; index += 8) {
    const batch = rows.slice(index, index + 8);
    const results = await Promise.all(batch.map((row) => isDefaultPassword(row.passwordHash)));
    batch.forEach((row, position) => { if (results[position]) matches.push(Number(row.id)); });
  }
  return matches;
}

try {
  const [columnRows] = await connection.execute("SHOW COLUMNS FROM students LIKE 'must_change_password'");
  const hasColumn = columnRows.length > 0;
  const defaultPasswordIds = await studentsOnDefaultPassword(hasColumn);

  const changes = [];
  if (!hasColumn) changes.push("Add students.must_change_password TINYINT(1) NOT NULL DEFAULT 0");
  if (defaultPasswordIds.length) {
    changes.push(`Flag ${defaultPasswordIds.length} student(s) still using the shared import password`);
  }

  if (checkOnly) {
    console.log(JSON.stringify({
      mode: "check",
      ready: changes.length === 0,
      current: { mustChangePasswordColumn: hasColumn, studentsOnDefaultPassword: defaultPasswordIds.length },
      changes,
    }, null, 2));
  } else {
    if (!hasColumn) {
      await connection.execute(
        "ALTER TABLE students ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash",
      );
    }
    for (let index = 0; index < defaultPasswordIds.length; index += 500) {
      const ids = defaultPasswordIds.slice(index, index + 500);
      await connection.query("UPDATE students SET must_change_password=1 WHERE id IN (?)", [ids]);
    }
    console.log(`Student password-change flag is ready (${defaultPasswordIds.length} student(s) flagged)`);
  }
} finally {
  await connection.end();
}
