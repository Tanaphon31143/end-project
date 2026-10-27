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
const migrationKey = "20261017_academic_terms";
const profileContextKey = "20261017_profile_request_terms";

async function identitySnapshot() {
  const [students] = await connection.execute("SELECT COUNT(*) total,BIT_XOR(CRC32(CONCAT_WS(':',id,email,student_code,password_hash))) fingerprint FROM students");
  const faces = {};
  for (const table of ["face_data", "face_samples", "student_face_email_bindings"]) {
    const [exists] = await connection.execute("SHOW TABLES LIKE ?", [table]);
    if (exists.length) {
      const [counts] = await connection.query(`SELECT COUNT(*) total FROM \`${table}\``);
      faces[table] = counts[0].total;
    }
  }
  return JSON.stringify({ students: students[0], faces });
}

try {
  const [tables] = await connection.execute("SHOW TABLES LIKE 'student_term_enrollments'");
  const [markers] = await connection.execute("SHOW TABLES LIKE 'academic_term_migrations'");
  const [indexes] = await connection.execute("SHOW INDEX FROM subjects");
  const [profileColumns] = await connection.execute("SHOW COLUMNS FROM profile_edit_requests");
  const hasProfileYear = profileColumns.some(column => column.Field === "academic_year");
  const hasProfileSemester = profileColumns.some(column => column.Field === "semester");
  const groupedIndexes = new Map();
  for (const index of indexes) {
    const group = groupedIndexes.get(index.Key_name) ?? [];
    group.push(index);
    groupedIndexes.set(index.Key_name, group);
  }
  const legacyUniqueIndexes = [...groupedIndexes.entries()].filter(([, columns]) =>
    columns.length === 1 && Number(columns[0].Non_unique) === 0 && columns[0].Column_name === "subject_code",
  ).map(([name]) => name);
  const hasTermIndex = [...groupedIndexes.values()].some((columns) =>
    Number(columns[0].Non_unique) === 0 && columns.sort((a, b) => a.Seq_in_index - b.Seq_in_index)
      .map((column) => column.Column_name).join(",") === "subject_code,academic_year,semester",
  );
  const [applied] = markers.length
    ? await connection.execute("SELECT migration_key FROM academic_term_migrations WHERE migration_key=?", [migrationKey])
    : [[]];
  const [profileApplied] = markers.length
    ? await connection.execute("SELECT migration_key FROM academic_term_migrations WHERE migration_key=?", [profileContextKey])
    : [[]];
  const pending = {
    createMemberships: tables.length === 0,
    backfillLegacyTermOne: applied.length === 0,
    allowSubjectCodesAcrossTerms: !hasTermIndex || legacyUniqueIndexes.length > 0,
    preservePlacementRequestTerm: !hasProfileYear || !hasProfileSemester || profileApplied.length === 0,
  };
  if (checkOnly) {
    console.log(JSON.stringify({ mode: "check", ready: !Object.values(pending).some(Boolean), pending }, null, 2));
  } else {
    const identitiesBefore = await identitySnapshot();
    const sql = await readFile(new URL("../database/migrations/20261017_academic_terms_up.sql", import.meta.url), "utf8");
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).filter((statement) => statement.trim())) {
      await connection.query(statement);
    }
    // Add the replacement constraint before dropping the global constraint.
    if (!hasTermIndex) {
      await connection.execute("ALTER TABLE subjects ADD UNIQUE KEY uq_subject_code_term (subject_code,academic_year,semester)");
    }
    for (const index of legacyUniqueIndexes) {
      if (!/^[a-zA-Z0-9_]+$/.test(index)) throw new Error("Unexpected subject index name");
      await connection.execute(`ALTER TABLE subjects DROP INDEX \`${index}\``);
    }
    if (!hasProfileYear) await connection.execute("ALTER TABLE profile_edit_requests ADD COLUMN academic_year VARCHAR(10) NULL");
    if (!hasProfileSemester) await connection.execute("ALTER TABLE profile_edit_requests ADD COLUMN semester TINYINT UNSIGNED NULL");
    await connection.beginTransaction();
    try {
      const [locked] = await connection.execute("SELECT migration_key FROM academic_term_migrations WHERE migration_key=? FOR UPDATE", [migrationKey]);
      if (!locked.length) {
        // The existing roster belongs to term 1. Never copy it into a fresh term 2.
        await connection.execute(`INSERT IGNORE INTO student_term_enrollments (student_id,classroom_id,academic_year,semester,class_number)
          SELECT s.id,s.class_id,COALESCE(NULLIF(c.academic_year,''),ss.academic_year),1,
            CASE WHEN s.class_number>0 AND (SELECT COUNT(*) FROM students peer WHERE peer.class_id=s.class_id AND peer.class_number=s.class_number)=1 THEN s.class_number ELSE NULL END
          FROM students s JOIN classrooms c ON c.id=s.class_id
          CROSS JOIN (SELECT academic_year FROM school_settings ORDER BY id LIMIT 1) ss`);
        // Existing attendance proves historical membership, independently of the current room.
        await connection.execute(`INSERT IGNORE INTO student_term_enrollments (student_id,classroom_id,academic_year,semester,class_number)
          SELECT history.student_id,history.classroom_id,history.academic_year,history.semester,NULL
          FROM (SELECT a.student_id,sb.classroom_id,sb.academic_year,sb.semester,
            ROW_NUMBER() OVER (PARTITION BY a.student_id,sb.academic_year,sb.semester ORDER BY a.attendance_date DESC,a.id DESC) row_rank
            FROM attendance_records a JOIN subjects sb ON sb.id=a.subject_id JOIN students st ON st.id=a.student_id
            WHERE sb.classroom_id IS NOT NULL AND sb.semester IN (1,2)) history
          WHERE history.row_rank=1`);
        await connection.execute("INSERT INTO academic_term_migrations (migration_key) VALUES (?)", [migrationKey]);
      }
      const [profileLocked] = await connection.execute("SELECT migration_key FROM academic_term_migrations WHERE migration_key=? FOR UPDATE", [profileContextKey]);
      if (!profileLocked.length) {
        await connection.execute(`UPDATE profile_edit_requests r
          JOIN students s ON s.id=r.student_id LEFT JOIN classrooms c ON c.id=s.class_id
          CROSS JOIN (SELECT academic_year FROM school_settings ORDER BY id LIMIT 1) ss
          SET r.academic_year=COALESCE(NULLIF(c.academic_year,''),ss.academic_year),r.semester=1
          WHERE r.field_type IN ('CLASS_NUMBER','CLASSROOM','GRADE_LEVEL')
            AND (r.academic_year IS NULL OR r.semester IS NULL)`);
        await connection.execute("INSERT INTO academic_term_migrations (migration_key) VALUES (?)", [profileContextKey]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    if (await identitySnapshot() !== identitiesBefore) {
      throw new Error("Student identity data changed during migration; investigate concurrent account changes before continuing");
    }
    console.log("Academic terms ready; student accounts, emails, and face data retained.");
  }
} finally {
  await connection.end();
}
