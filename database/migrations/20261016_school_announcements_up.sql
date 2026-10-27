-- The migration runner applies schema changes conditionally, preserving title columns
-- already wider than VARCHAR(200): npm run db:school-announcements
-- Read-only preflight: npm run db:school-announcements:check
-- A down migration would delete uploaded files, so this migration is forward-only.
CREATE TABLE IF NOT EXISTS school_announcement_attachments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  file_data MEDIUMBLOB NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_school_announcement_attachments_announcement (announcement_id, id),
  CONSTRAINT fk_school_announcement_attachments_announcement
    FOREIGN KEY (announcement_id) REFERENCES school_announcements(id)
    ON DELETE CASCADE
);
