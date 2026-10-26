export function parseAcademicTerm(input, fallback) {
  const academicYear = String(input?.academicYear ?? fallback.academicYear).trim();
  const semester = Number(input?.semester ?? fallback.semester);
  if (!/^\d{4}$/.test(academicYear) || ![1, 2].includes(semester)) {
    throw new Error("กรุณาเลือกปีการศึกษาและภาคเรียนที่ถูกต้อง");
  }
  return { academicYear, semester };
}

export function termEnrollmentWhere(term, classroomId) {
  return {
    academicYear: term.academicYear,
    semester: term.semester,
    ...(classroomId == null ? {} : { classroomId }),
  };
}
