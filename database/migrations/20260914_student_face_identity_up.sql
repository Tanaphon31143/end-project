CREATE TABLE IF NOT EXISTS student_face_identity_verifications (
  id CHAR(36) PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  method ENUM('GOOGLE') NOT NULL DEFAULT 'GOOGLE',
  status ENUM('PENDING','VERIFIED','FAILED','USED') NOT NULL DEFAULT 'PENDING',
  consented_at DATETIME(3) NOT NULL,
  account_verified_at DATETIME(3) NULL,
  student_data_verified_at DATETIME(3) NULL,
  liveness_verified_at DATETIME(3) NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_student_face_identity (student_id, status, expires_at)
);

CREATE TABLE IF NOT EXISTS student_face_profile_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  previous_face_data_id INT UNSIGNED NOT NULL,
  previous_registered_at DATETIME NULL,
  previous_image_count INT UNSIGNED NOT NULL,
  replaced_by_verification_id CHAR(36) NOT NULL,
  status ENUM('REVOKED') NOT NULL DEFAULT 'REVOKED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_student_face_history (student_id, created_at)
);

ALTER TABLE face_data ADD COLUMN IF NOT EXISTS identity_verification_id CHAR(36) NULL;
ALTER TABLE face_data ADD COLUMN IF NOT EXISTS verification_method VARCHAR(20) NULL;
ALTER TABLE face_data ADD COLUMN IF NOT EXISTS liveness_verified_at DATETIME(3) NULL;
