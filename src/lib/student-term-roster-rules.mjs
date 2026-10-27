export function parseStudentTermAssignment(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "ข้อมูลรายชื่อนักเรียนไม่ถูกต้อง" };
  }
  const academicYear = String(input.academicYear ?? "").trim();
  const semester = Number(input.semester);
  const classroomId = Number(input.classId ?? input.classroomId);
  const number = Number(input.classNumber ?? input.number);
  const studentId = Number(input.studentId);
  const studentCode = String(input.studentCode ?? "").trim();
  const email = String(input.email ?? "").trim().toLowerCase();

  if (!/^\d{4}$/.test(academicYear) || ![1, 2].includes(semester)) {
    return { error: "กรุณาเลือกปีการศึกษาและภาคเรียนให้ถูกต้อง" };
  }
  if (!Number.isSafeInteger(classroomId) || classroomId < 1) {
    return { error: "กรุณาเลือกห้องเรียน" };
  }
  if (!Number.isSafeInteger(number) || number < 1 || number > 999) {
    return { error: "เลขที่ต้องเป็นจำนวนเต็มระหว่าง 1–999" };
  }
  if (input.action === "ENROLL_EXISTING") {
    const hasId = Number.isSafeInteger(studentId) && studentId > 0;
    const hasCode = Boolean(studentCode);
    const hasEmail = Boolean(email);
    if (Number(hasId) + Number(hasCode) + Number(hasEmail) !== 1) {
      return { error: "ระบุนักเรียนเดิมด้วยรหัสนักเรียนหรืออีเมลหนึ่งรายการ" };
    }
    if (studentCode.length > 50 || (email && (email.length > 255 || !/^\S+@\S+\.\S+$/.test(email)))) {
      return { error: "รหัสนักเรียนหรืออีเมลไม่ถูกต้อง" };
    }
    return {
      value: {
        action: "ENROLL_EXISTING",
        studentId: hasId ? studentId : null,
        studentCode: hasCode ? studentCode : null,
        email: hasEmail ? email : null,
        academicYear,
        semester,
        classroomId,
        classNumber: number,
      },
    };
  }

  return {
    value: {
      action: "CREATE_ACCOUNT",
      academicYear,
      semester,
      classroomId,
      classNumber: number,
    },
  };
}
