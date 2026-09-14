import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
const url = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname, port: Number(url.port || 3306),
  user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
  database: url.pathname.slice(1), ssl: { rejectUnauthorized: true }, multipleStatements: true,
});
try {
  await connection.query(await readFile(new URL('../database/migrations/20260910_student_round3_up.sql', import.meta.url), 'utf8'));
  console.log('Student Round 3 migration applied');
} finally { await connection.end(); }
