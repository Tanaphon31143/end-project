CREATE TABLE IF NOT EXISTS student_face_enrollment_challenges (
  id CHAR(36) PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  challenges_json JSON NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_face_enrollment_token (token_hash),
  INDEX idx_face_enrollment_student (student_id, created_at)
);
