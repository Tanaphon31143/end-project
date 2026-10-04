CREATE TABLE IF NOT EXISTS auth_sessions (
  session_hash CHAR(64) NOT NULL PRIMARY KEY,
  account_id INT UNSIGNED NOT NULL,
  account_role ENUM('admin','teacher','student') NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_auth_session_account (account_role, account_id, revoked_at),
  INDEX idx_auth_session_expiry (expires_at)
);

CREATE TABLE IF NOT EXISTS auth_login_limits (
  bucket_hash CHAR(64) NOT NULL PRIMARY KEY,
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  window_started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_auth_login_limit_updated (updated_at)
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(32) NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  account_role ENUM('admin','teacher','student') NOT NULL,
  account_id INT UNSIGNED NOT NULL,
  verified_email VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_oauth_provider_subject (provider, provider_subject),
  UNIQUE KEY uq_oauth_account (provider, account_role, account_id),
  INDEX idx_oauth_verified_email (verified_email)
);
