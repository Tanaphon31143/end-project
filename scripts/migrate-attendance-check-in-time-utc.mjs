import mysql from "mysql2/promise";

// attendance_records.check_in_time is UTC for every scan and teacher check-in, but the
// admin "add attendance" form used to store the typed Bangkok time as-is. Those rows are
// the ones with an 'ADD' row in attendance_record_audits (written in the same transaction).
// Each converted record is remembered, so running this again never shifts a row twice.

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
  dateStrings: true,
});

const pendingSql = `SELECT a.id,a.check_in_time checkInTime
  FROM attendance_records a
  WHERE a.check_in_time IS NOT NULL
    AND EXISTS (SELECT 1 FROM attendance_record_audits aa WHERE aa.attendance_record_id=a.id AND aa.action='ADD')
    AND NOT EXISTS (SELECT 1 FROM attendance_check_in_time_utc_fixes fx WHERE fx.attendance_record_id=a.id)
  ORDER BY a.id`;

try {
  const [tableRows] = await connection.execute("SHOW TABLES LIKE 'attendance_check_in_time_utc_fixes'");
  const hasTable = tableRows.length > 0;
  const [pending] = hasTable
    ? await connection.execute(pendingSql)
    : await connection.execute(pendingSql.replace(/\n\s*AND NOT EXISTS \([^)]*\)/, ""));

  if (checkOnly) {
    console.log(JSON.stringify({
      mode: "check",
      ready: hasTable && pending.length === 0,
      trackingTable: hasTable,
      recordsToConvert: pending.map((row) => ({ id: Number(row.id), storedBangkokTime: row.checkInTime })),
    }, null, 2));
  } else {
    await connection.execute(`CREATE TABLE IF NOT EXISTS attendance_check_in_time_utc_fixes (
      attendance_record_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
      original_check_in_time DATETIME NOT NULL,
      fixed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`);
    await connection.beginTransaction();
    try {
      for (const row of pending) {
        await connection.execute(
          "INSERT INTO attendance_check_in_time_utc_fixes(attendance_record_id,original_check_in_time) VALUES(?,?)",
          [row.id, row.checkInTime],
        );
        await connection.execute(
          "UPDATE attendance_records SET check_in_time=check_in_time - INTERVAL 7 HOUR WHERE id=?",
          [row.id],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    console.log(`Admin-entered check-in times converted to UTC (${pending.length} record(s))`);
  }
} finally {
  await connection.end();
}
