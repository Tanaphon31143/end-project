import mysql from "mysql2/promise";

const value = process.env.DATABASE_URL;
if (!value) throw new Error("DATABASE_URL is not configured");
const url = new URL(value);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
});

// Only add non-unique indexes. Existing rows and constraints stay intact.
const indexes = [
  { table: "students", name: "idx_student_class_status", columns: ["class_id", "status"] },
  { table: "attendance_records", name: "idx_attendance_student_date_time", columns: ["student_id", "attendance_date", "check_in_time"] },
];

try {
  for (const { table, name, columns } of indexes) {
    const [existing] = await connection.query(`SHOW INDEX FROM \`${table}\``);
    const groups = new Map();
    for (const index of existing) {
      if (!groups.has(index.Key_name)) groups.set(index.Key_name, []);
      groups.get(index.Key_name)[index.Seq_in_index - 1] = index.Column_name;
    }
    const covered = [...groups.values()].some((actual) =>
      columns.every((column, position) => actual[position] === column),
    );
    if (covered) {
      console.log(`${name}: already covered`);
      continue;
    }
    if (groups.has(name)) throw new Error(`${name}: existing index has unexpected columns`);
    await connection.query(
      `ALTER TABLE \`${table}\` ADD INDEX \`${name}\` (${columns.map((column) => `\`${column}\``).join(", ")})`,
    );
    console.log(`${name}: added`);
  }
} finally {
  await connection.end();
}
