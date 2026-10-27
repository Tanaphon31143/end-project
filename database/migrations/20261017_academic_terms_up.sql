-- Membership changes never recreate student identities or alter face/email data.
-- The migration runner also adds nullable academic_year/semester to
-- profile_edit_requests after inspecting its columns, preserving the term
-- of placement corrections submitted before a rollover.
CREATE TABLE IF NOT EXISTS student_term_enrollments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  classroom_id INT UNSIGNED NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  semester TINYINT UNSIGNED NOT NULL,
  class_number INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_term (student_id, academic_year, semester),
  UNIQUE KEY uq_classroom_term_number (classroom_id, academic_year, semester, class_number),
  KEY idx_enrollment_classroom_term (classroom_id, academic_year, semester)
);

CREATE TABLE IF NOT EXISTS academic_term_migrations (
  migration_key VARCHAR(100) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
