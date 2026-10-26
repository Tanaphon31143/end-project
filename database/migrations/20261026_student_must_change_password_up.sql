-- Apply with the runner, which also flags students still on the shared import password:
--   npm run db:student-password-change
-- Read-only preflight: npm run db:student-password-change:check
ALTER TABLE students
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash;
