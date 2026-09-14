CREATE TABLE IF NOT EXISTS attendance_issue_attachments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  report_id INT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  image_mime VARCHAR(50) NOT NULL,
  image_data MEDIUMBLOB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_issue_attachment_report (report_id)
);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key VARCHAR(190) NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_event ON notifications (user_id, user_role, event_key);
