import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';

const url = new URL(process.env.DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname, port: Number(url.port || 3306),
  user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
  database: url.pathname.slice(1), ssl: { rejectUnauthorized: true }, multipleStatements: true,
});
try {
  const sql = await readFile(new URL('../database/migrations/20260914_student_face_identity_up.sql', import.meta.url), 'utf8');
  await connection.query(sql);
  console.log('Student face identity migration applied');
} finally { await connection.end(); }
