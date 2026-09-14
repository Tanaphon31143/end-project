ALTER TABLE student_face_identity_verifications ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) NULL;
ALTER TABLE student_face_identity_verifications ADD COLUMN IF NOT EXISTS verified_email VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS student_face_email_bindings (
  student_id INT UNSIGNED NOT NULL PRIMARY KEY,
  google_sub VARCHAR(255) NOT NULL,
  verified_email VARCHAR(255) NOT NULL,
  face_data_id INT UNSIGNED NOT NULL,
  bound_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_student_face_google_sub (google_sub),
  UNIQUE KEY uq_student_face_verified_email (verified_email),
  UNIQUE KEY uq_student_face_data (face_data_id)
);

ALTER TABLE face_samples ADD COLUMN IF NOT EXISTS image_sha256 CHAR(64) NULL;
ALTER TABLE face_samples ADD COLUMN IF NOT EXISTS image_dhash CHAR(16) NULL;
UPDATE face_samples SET image_sha256=SHA2(image_data,256) WHERE image_sha256 IS NULL;
