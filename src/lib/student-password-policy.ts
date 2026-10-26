import "server-only";

import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";

// Accounts created by the Excel import start with this shared password and are
// flagged with students.must_change_password until the student picks their own.
export const DEFAULT_IMPORTED_STUDENT_PASSWORD = "student@123";

export async function studentMustChangePassword(studentId: number) {
  const [rows] = await db.execute<(RowDataPacket & { mustChange: number })[]>(
    "SELECT must_change_password mustChange FROM students WHERE id=? LIMIT 1",
    [studentId],
  );
  return Boolean(rows[0]?.mustChange);
}
