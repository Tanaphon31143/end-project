CREATE TABLE IF NOT EXISTS school_announcements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT 1,
  created_by_admin_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_announcements_published (is_published, created_at)
);
CREATE TABLE IF NOT EXISTS auth_password_resets (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  account_id INT UNSIGNED NOT NULL,
  account_role ENUM('admin','teacher','student') NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_reset_account (account_role, account_id, used_at)
);
