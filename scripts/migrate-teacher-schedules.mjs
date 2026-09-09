import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
const parsedUrl = new URL(databaseUrl);
const connection = await mysql.createConnection({
  host: parsedUrl.hostname,
  port: Number(parsedUrl.port || 3306),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: parsedUrl.pathname.replace(/^\//, ""),
  ssl: {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
  },
});

const dayMap = new Map([
  ["จันทร์", 1],
  ["วันจันทร์", 1],
  ["mon", 1],
  ["monday", 1],
  ["อังคาร", 2],
  ["วันอังคาร", 2],
  ["tue", 2],
  ["tuesday", 2],
  ["พุธ", 3],
  ["วันพุธ", 3],
  ["wed", 3],
  ["wednesday", 3],
  ["พฤหัสบดี", 4],
  ["วันพฤหัสบดี", 4],
  ["thu", 4],
  ["thursday", 4],
  ["ศุกร์", 5],
  ["วันศุกร์", 5],
  ["fri", 5],
  ["friday", 5],
  ["เสาร์", 6],
  ["วันเสาร์", 6],
  ["sat", 6],
  ["saturday", 6],
  ["อาทิตย์", 7],
  ["วันอาทิตย์", 7],
  ["sun", 7],
  ["sunday", 7],
]);

try {
  const [profileColumns] = await connection.query(
    `SHOW COLUMNS FROM teachers LIKE 'profile_image'`,
  );
  if (!profileColumns.length)
    await connection.query(
      `ALTER TABLE teachers ADD COLUMN profile_image MEDIUMBLOB NULL,ADD COLUMN profile_image_mime VARCHAR(50) NULL`,
    );
  await connection.query(
    `CREATE TABLE IF NOT EXISTS schedules (id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,subject_id INT UNSIGNED NOT NULL,classroom_id INT UNSIGNED NOT NULL,day_of_week TINYINT UNSIGNED NOT NULL,period_name VARCHAR(50) NULL,start_time TIME NOT NULL,end_time TIME NOT NULL,is_active BOOLEAN NOT NULL DEFAULT TRUE,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uq_schedule_subject_day_start(subject_id,day_of_week,start_time),INDEX idx_schedule_classroom_day(classroom_id,day_of_week))`,
  );
  await connection.query(
    `CREATE TABLE IF NOT EXISTS teacher_notifications (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,teacher_id INT UNSIGNED NOT NULL,title VARCHAR(180) NOT NULL,message VARCHAR(500) NOT NULL,href VARCHAR(255) NULL,type VARCHAR(30) NOT NULL DEFAULT 'INFO',is_read BOOLEAN NOT NULL DEFAULT FALSE,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,INDEX idx_teacher_notification_read(teacher_id,is_read,created_at))`,
  );
  await connection.query(
    `INSERT INTO teacher_notifications(teacher_id,title,message,href,type,is_read,created_at) SELECT sb.teacher_id,IF(cs.status='CLOSED','ประวัติรอบเช็คชื่อ','รอบเช็คชื่อที่เปิดอยู่'),CONCAT(sb.subject_code,' วันที่ ',DATE_FORMAT(cs.session_date,'%d/%m/%Y'),' เวลา ',TIME_FORMAT(cs.start_time,'%H:%i'),'–',TIME_FORMAT(cs.end_time,'%H:%i'),' น.'),IF(cs.status='CLOSED',CONCAT('/teacher/history/',cs.id),CONCAT('/teacher/scan/',cs.id)),'SESSION',TRUE,cs.created_at FROM check_in_sessions cs JOIN subjects sb ON sb.id=cs.subject_id WHERE sb.teacher_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM teacher_notifications tn WHERE tn.teacher_id=sb.teacher_id AND tn.href IN(CONCAT('/teacher/history/',cs.id),CONCAT('/teacher/scan/',cs.id)))`,
  );
  const [thresholdColumns] = await connection.query(
    `SHOW COLUMNS FROM school_settings LIKE 'face_match_threshold'`,
  );
  if (!thresholdColumns.length)
    await connection.query(
      `ALTER TABLE school_settings ADD COLUMN face_match_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.550`,
    );
  const [columns] = await connection.query(
    `SHOW COLUMNS FROM check_in_sessions LIKE 'schedule_id'`,
  );
  if (!columns.length)
    await connection.query(
      `ALTER TABLE check_in_sessions ADD COLUMN schedule_id INT UNSIGNED NULL`,
    );
  const [indexes] = await connection.query(
    `SHOW INDEX FROM check_in_sessions WHERE Key_name='idx_check_in_session_schedule'`,
  );
  if (!indexes.length)
    await connection.query(
      `CREATE INDEX idx_check_in_session_schedule ON check_in_sessions(schedule_id)`,
    );
  const [oldAttendanceIndex] = await connection.query(
    `SHOW INDEX FROM attendance_records WHERE Key_name='uq_attendance_student_subject_date'`,
  );
  if (oldAttendanceIndex.length)
    await connection.query(
      `ALTER TABLE attendance_records DROP INDEX uq_attendance_student_subject_date`,
    );
  const [sessionAttendanceIndex] = await connection.query(
    `SHOW INDEX FROM attendance_records WHERE Key_name='uq_attendance_student_session'`,
  );
  if (!sessionAttendanceIndex.length)
    await connection.query(
      `CREATE UNIQUE INDEX uq_attendance_student_session ON attendance_records(student_id,check_in_session_id)`,
    );
  const [subjectDateIndex] = await connection.query(
    `SHOW INDEX FROM attendance_records WHERE Key_name='idx_attendance_subject_date'`,
  );
  if (!subjectDateIndex.length)
    await connection.query(
      `CREATE INDEX idx_attendance_subject_date ON attendance_records(subject_id,attendance_date)`,
    );
  const [subjects] = await connection.query(
    `SELECT id,classroom_id classroomId,study_days studyDays,TIME_FORMAT(start_time,'%H:%i:%s') startTime,TIME_FORMAT(end_time,'%H:%i:%s') endTime FROM subjects WHERE is_active=1 AND classroom_id IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL`,
  );
  let created = 0;
  for (const subject of subjects) {
    const days = String(subject.studyDays || "")
      .split(/[,/|]+/)
      .map((item) => item.trim().toLowerCase())
      .map((item) => dayMap.get(item))
      .filter(Boolean);
    for (const dayOfWeek of new Set(days)) {
      const [result] = await connection.execute(
        `INSERT IGNORE INTO schedules(subject_id,classroom_id,day_of_week,period_name,start_time,end_time) VALUES(?,?,?,?,?,?)`,
        [
          subject.id,
          subject.classroomId,
          dayOfWeek,
          "คาบเรียนเดิม",
          subject.startTime,
          subject.endTime,
        ],
      );
      created += result.affectedRows;
    }
  }
  console.log(`Teacher schedules are ready. Added ${created} schedule row(s).`);
} finally {
  await connection.end();
}
