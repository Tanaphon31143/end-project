export type AcademicTerm = { academicYear: string; semester: number };
export function parseAcademicTerm(input: { academicYear?: unknown; semester?: unknown } | undefined, fallback: AcademicTerm): AcademicTerm;
export function termEnrollmentWhere(term: AcademicTerm, classroomId?: number | null): AcademicTerm & { classroomId?: number };
