// Accounts created by the Excel import start with this shared password and are
// flagged with students.must_change_password until the student picks their own.
// The flag is read with the session (AppSession.mustChangePassword in @/lib/auth).
export const DEFAULT_IMPORTED_STUDENT_PASSWORD = "student@123";
