import { getStudentSession } from "@/lib/auth";
import { getActiveSessionsForStudent } from "@/lib/student-check-in";
import { checkLivenessFailureLimit, issueLivenessChallenge } from "@/lib/student-liveness";
import { canIssueLivenessChallenge } from "@/lib/student-rules.mjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const student = await getStudentSession();
  if (!student) return Response.json({ message: "กรุณาเข้าสู่ระบบนักเรียน" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { sessionId?: unknown };
  const sessionId = Number(body.sessionId);
  if (!Number.isInteger(sessionId) || sessionId < 1) {
    return Response.json({ message: "คาบเรียนไม่ถูกต้อง" }, { status: 400 });
  }

  const [sessions, limit] = await Promise.all([
    getActiveSessionsForStudent(student.id, sessionId),
    checkLivenessFailureLimit(student.id, sessionId),
  ]);
  const policy = canIssueLivenessChallenge({
    sessionOpen: Boolean(sessions[0]),
    failedLivenessAttempts: 3 - limit.remainingAttempts,
  });
  if (!policy.allowed && policy.reason === "SESSION_EXPIRED") {
    return Response.json({ message: "คาบเรียนนี้ยังไม่เริ่ม ปิดแล้ว หรือไม่ใช่ห้องเรียนของคุณ" }, { status: 409 });
  }
  if (!policy.allowed) {
    return Response.json(
      { message: "ตรวจบุคคลจริงไม่ผ่านครบ 3 ครั้ง กรุณาติดต่อครูผู้สอน", code: "LIVENESS_LIMITED" },
      { status: 429 },
    );
  }

  return Response.json({
    ...(await issueLivenessChallenge(student.id, sessionId)),
    remainingAttempts: limit.remainingAttempts,
  });
}
