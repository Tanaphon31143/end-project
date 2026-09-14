-- Export attachment data before rollback; these tables contain uploaded files.
DROP TABLE IF EXISTS attendance_issue_attachments;
ALTER TABLE notifications DROP INDEX uq_notification_event;
ALTER TABLE notifications DROP COLUMN event_key;
