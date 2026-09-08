import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
const url = new URL(databaseUrl);
const connection = await mysql.createConnection({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.replace(/^\//, ""), ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } });

function similarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  if (sum === 0) return 1;
  return Math.max(0, Math.min(1, (1 - Math.sqrt(Math.round(2500 * sum) / 100) / 100 - 0.2) / 0.6));
}
const percentile = (items, value) => items.length ? items[Math.min(items.length - 1, Math.floor((items.length - 1) * value))] : null;

try {
  const [rows] = await connection.query(`SELECT student_id studentId,embedding FROM face_samples ORDER BY student_id,id`);
  const samples = rows.map((row) => ({ studentId: row.studentId, embedding: typeof row.embedding === "string" ? JSON.parse(row.embedding) : row.embedding })).filter((row) => Array.isArray(row.embedding));
  const genuine = [], impostor = [];
  for (let i = 0; i < samples.length; i++) for (let j = i + 1; j < samples.length; j++) {
    const score = similarity(samples[i].embedding, samples[j].embedding);
    if (samples[i].studentId === samples[j].studentId) genuine.push(score); else impostor.push(score);
  }
  genuine.sort((a, b) => a - b); impostor.sort((a, b) => a - b);
  const genuineFloor = percentile(genuine, 0.1);
  const impostorCeiling = percentile(impostor, 0.99);
  const threshold = genuineFloor !== null && impostorCeiling !== null && genuineFloor > impostorCeiling ? Math.min(0.9, Math.max(0.5, (genuineFloor + impostorCeiling) / 2)) : 0.55;
  await connection.execute(`UPDATE school_settings SET face_match_threshold=? ORDER BY id LIMIT 1`, [threshold.toFixed(3)]);
  console.log(`Face threshold calibrated to ${threshold.toFixed(3)} from ${samples.length} samples (${genuine.length} genuine, ${impostor.length} impostor pairs).`);
} finally { await connection.end(); }
