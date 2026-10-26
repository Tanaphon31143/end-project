import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { db } from "@/lib/db";
import { parseAcademicTerm } from "@/lib/academic-term-rules.mjs";

export { parseAcademicTerm, termEnrollmentWhere } from "@/lib/academic-term-rules.mjs";
export type AcademicTerm = { academicYear: string; semester: number };

export async function getSchoolTerm() {
  const [settings] = await db.execute<(RowDataPacket & { academicYear: string; semester: number })[]>(
    "SELECT academic_year academicYear,semester FROM school_settings ORDER BY id LIMIT 1",
  );
  if (!settings[0]) throw new Error("ยังไม่ได้ตั้งค่าปีการศึกษาและภาคเรียน");
  return parseAcademicTerm(settings[0], settings[0]);
}
