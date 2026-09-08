CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(180) NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE students ADD COLUMN IF NOT EXISTS class_id INT UNSIGNED NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS class_number INT UNSIGNED NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(150) NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE students ADD COLUMN IF NOT EXISTS birthday DATE NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image MEDIUMBLOB NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image_mime VARCHAR(50) NULL;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_code VARCHAR(30) NULL;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS profile_image MEDIUMBLOB NULL;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS profile_image_mime VARCHAR(50) NULL;

CREATE TABLE IF NOT EXISTS classrooms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  level VARCHAR(30) NOT NULL,
  advisor_teacher_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_classroom_advisor (advisor_teacher_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject_code VARCHAR(30) NOT NULL UNIQUE,
  subject_name VARCHAR(200) NOT NULL,
  teacher_id INT UNSIGNED NULL,
  classroom_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_subject_teacher (teacher_id),
  INDEX idx_subject_classroom (classroom_id)
);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS grade_level VARCHAR(10) NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS semester TINYINT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10) NOT NULL DEFAULT '2569';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS credits DECIMAL(3,1) NOT NULL DEFAULT 1.0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS study_days VARCHAR(100) NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS start_time TIME NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS end_time TIME NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS location VARCHAR(150) NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS attendance_mode ENUM('EVERY_PERIOD','FIRST_PERIOD') NOT NULL DEFAULT 'EVERY_PERIOD';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description VARCHAR(255) NULL;

INSERT IGNORE INTO classrooms (name, level) VALUES
  ('ม.5/1', 'ม.5'),
  ('ม.5/2', 'ม.5'),
  ('ม.5/3', 'ม.5'),
  ('ม.5/4', 'ม.5');

CREATE TABLE IF NOT EXISTS face_data (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  reference_image_url VARCHAR(500) NULL,
  image_count INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('READY','NEEDS_IMAGES','INACTIVE') NOT NULL DEFAULT 'NEEDS_IMAGES',
  registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_face_student (student_id)
);

ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS room_number INT UNSIGNED NULL;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10) NOT NULL DEFAULT '2569';
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS semester TINYINT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS note VARCHAR(255) NULL;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS face_samples (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  image_mime VARCHAR(50) NOT NULL,
  embedding JSON NOT NULL,
  quality_score DECIMAL(5,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_face_sample_student (student_id)
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NULL,
  attendance_date DATE NOT NULL,
  check_in_time DATETIME NULL,
  status ENUM('PRESENT','LATE','ABSENT','LEAVE') NOT NULL,
  confidence DECIMAL(5,2) NULL,
  check_in_session_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attendance_date (attendance_date),
  INDEX idx_attendance_student (student_id),
  UNIQUE KEY uq_attendance_student_session (student_id, check_in_session_id)
);

CREATE TABLE IF NOT EXISTS check_in_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject_id INT UNSIGNED NOT NULL,
  classroom_id INT UNSIGNED NOT NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_after TIME NOT NULL,
  status ENUM('ACTIVE','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  created_by_admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_check_in_session_date (session_date),
  INDEX idx_check_in_session_subject (subject_id),
  UNIQUE KEY uq_check_in_session_round (subject_id, session_date, start_time)
);

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS check_in_session_id BIGINT UNSIGNED NULL;

ALTER TABLE check_in_sessions MODIFY COLUMN created_by_admin_id INT UNSIGNED NULL;
ALTER TABLE check_in_sessions ADD COLUMN IF NOT EXISTS created_by_teacher_id INT UNSIGNED NULL;

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) NULL,
  description TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user_created (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS attendance_record_audits (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attendance_record_id BIGINT UNSIGNED NOT NULL,
  admin_id INT UNSIGNED NOT NULL,
  action ENUM('ADD','STATUS_UPDATE') NOT NULL,
  old_status ENUM('PRESENT','LATE','ABSENT','LEAVE') NULL,
  new_status ENUM('PRESENT','LATE','ABSENT','LEAVE') NOT NULL,
  note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attendance_audit_record (attendance_record_id),
  INDEX idx_attendance_audit_admin (admin_id)
);

CREATE TABLE IF NOT EXISTS teacher_notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  message VARCHAR(500) NOT NULL,
  href VARCHAR(255) NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'INFO',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_teacher_notification_read (teacher_id, is_read, created_at)
);

CREATE TABLE IF NOT EXISTS schedules (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subject_id INT UNSIGNED NOT NULL,
  classroom_id INT UNSIGNED NOT NULL,
  day_of_week TINYINT UNSIGNED NOT NULL,
  period_name VARCHAR(50) NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_schedule_subject_day_start (subject_id, day_of_week, start_time),
  INDEX idx_schedule_classroom_day (classroom_id, day_of_week)
);

ALTER TABLE check_in_sessions ADD COLUMN IF NOT EXISTS schedule_id INT UNSIGNED NULL;

CREATE TABLE IF NOT EXISTS attendance_issue_reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  subject_id INT UNSIGNED NULL,
  incident_date DATE NOT NULL,
  class_time TIME NOT NULL,
  room VARCHAR(150) NOT NULL,
  issue_type VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  status ENUM('PENDING','REVIEWING','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  resolution TEXT NULL,
  attachment_data MEDIUMBLOB NULL,
  attachment_mime VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_issue_student (student_id),
  INDEX idx_issue_status (status),
  INDEX idx_issue_created (created_at)
);

CREATE TABLE IF NOT EXISTS school_settings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  school_name VARCHAR(200) NOT NULL DEFAULT 'โรงเรียนขุขันธ์',
  academic_year VARCHAR(10) NOT NULL DEFAULT '2569',
  semester TINYINT UNSIGNED NOT NULL DEFAULT 1,
  school_start_time TIME NOT NULL DEFAULT '08:00:00',
  late_after TIME NOT NULL DEFAULT '08:15:00',
  face_recognition_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  face_match_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.550,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO school_settings (school_name)
SELECT 'โรงเรียนขุขันธ์'
WHERE NOT EXISTS (SELECT 1 FROM school_settings);

-- Student Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  user_role VARCHAR(30) NOT NULL DEFAULT 'student',
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  related_entity_type VARCHAR(50) NULL,
  related_entity_id VARCHAR(50) NULL,
  action_url VARCHAR(255) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_notifications_user (user_id, user_role, is_read, created_at)
);

-- Face Details Extensions
ALTER TABLE face_data ADD COLUMN IF NOT EXISTS registered_by_id INT UNSIGNED NULL;
ALTER TABLE face_data ADD COLUMN IF NOT EXISTS registered_by_name VARCHAR(150) NULL;
ALTER TABLE face_data ADD COLUMN IF NOT EXISTS registered_by_role VARCHAR(50) NULL;
ALTER TABLE face_data ADD COLUMN IF NOT EXISTS device_type VARCHAR(50) NULL;
ALTER TABLE face_data ADD COLUMN IF NOT EXISTS device_name VARCHAR(150) NULL;
ALTER TABLE face_data ADD COLUMN IF NOT EXISTS browser VARCHAR(100) NULL;

-- Face Samples Pose Type (FRONT, LEFT, RIGHT, UP, DOWN, or NULL for legacy)
ALTER TABLE face_samples ADD COLUMN IF NOT EXISTS pose_type VARCHAR(30) NULL;

-- Profile Edit Requests
CREATE TABLE IF NOT EXISTS profile_edit_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  old_value VARCHAR(255) NOT NULL,
  new_value VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  attachment_name VARCHAR(255) NULL,
  attachment_mime VARCHAR(100) NULL,
  attachment_size INT UNSIGNED NULL,
  attachment_data MEDIUMBLOB NULL,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT NULL,
  reviewed_by_admin_id INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_profile_req_student (student_id, status),
  INDEX idx_profile_req_pending (status, field_type)
);

-- Face Scan Attempts Log
CREATE TABLE IF NOT EXISTS scan_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  attendance_session_id BIGINT UNSIGNED NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason VARCHAR(50) NULL,
  liveness_result VARCHAR(50) NULL,
  match_result VARCHAR(50) NULL,
  confidence DECIMAL(5,2) NULL,
  device_info VARCHAR(255) NULL,
  ip_hash VARCHAR(64) NULL,
  attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scan_attempts_user (user_id, attempted_at),
  INDEX idx_scan_attempts_session (attendance_session_id)
);
