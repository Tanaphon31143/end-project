export function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export function attendanceStatus(nowMinutes, lateAfterMinutes) {
  return nowMinutes > lateAfterMinutes ? "LATE" : "PRESENT";
}

export function canAccessTeacherResource(sessionRole, ownerTeacherId, currentTeacherId) {
  return sessionRole === "teacher" && ownerTeacherId === currentTeacherId;
}
