export function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean;
export function attendanceStatus(nowMinutes: number, lateAfterMinutes: number): "PRESENT" | "LATE";
export function canAccessTeacherResource(sessionRole: string | undefined, ownerTeacherId: number, currentTeacherId: number): boolean;
