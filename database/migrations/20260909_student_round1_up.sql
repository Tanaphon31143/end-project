CREATE TABLE IF NOT EXISTS student_liveness_challenges (
  id CHAR(36) PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  attendance_session_id BIGINT UNSIGNED NOT NULL,
  challenges_json JSON NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_student_liveness_token_hash (token_hash),
  INDEX idx_student_liveness_owner (user_id, attendance_session_id, created_at),
  INDEX idx_student_liveness_expiry (expires_at)
);

-- Audit-only evidence: never store camera frames or biometric embeddings here.
CREATE TABLE IF NOT EXISTS student_scan_evidence (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  scan_attempt_id BIGINT UNSIGNED NULL,
  liveness_challenge_id CHAR(36) NULL,
  user_id INT UNSIGNED NOT NULL,
  attendance_session_id BIGINT UNSIGNED NOT NULL,
  liveness_result VARCHAR(50) NOT NULL,
  liveness_score DECIMAL(5,4) NULL,
  match_result VARCHAR(50) NULL,
  similarity DECIMAL(6,5) NULL,
  threshold_value DECIMAL(6,5) NULL,
  evidence_json JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_student_scan_evidence_attempt (scan_attempt_id),
  INDEX idx_student_scan_evidence_session (user_id, attendance_session_id, created_at),
  INDEX idx_student_scan_evidence_challenge (liveness_challenge_id)
);
