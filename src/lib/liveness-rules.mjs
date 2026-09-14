export const LIVENESS_CHALLENGES = ["BLINK", "TURN_LEFT", "TURN_RIGHT", "LOOK_UP"];

const acceptedGestures = {
  BLINK: new Set(["blink left eye", "blink right eye"]),
  TURN_LEFT: new Set(["facing left"]),
  TURN_RIGHT: new Set(["facing right"]),
  LOOK_UP: new Set(["head up"]),
};

export function validateLivenessEvidence({ expected, evidence, issuedAt, expiresAt, now = Date.now() }) {
  if (!Array.isArray(expected) || expected.length !== 3 || new Set(expected).size !== 3) return { valid: false, reason: "INVALID_CHALLENGE" };
  if (!Array.isArray(evidence) || evidence.length !== expected.length) return { valid: false, reason: "MISSING_EVIDENCE" };
  if (now < issuedAt - 2_000 || now > expiresAt) return { valid: false, reason: "CHALLENGE_EXPIRED" };

  let previousTime = issuedAt;
  let score = 1;
  for (let index = 0; index < expected.length; index += 1) {
    const challenge = expected[index];
    const item = evidence[index];
    if (!LIVENESS_CHALLENGES.includes(challenge) || item?.challenge !== challenge) {
      return { valid: false, reason: "CHALLENGE_MISMATCH" };
    }
    const capturedAt = Number(item.capturedAt);
    if (!Number.isFinite(capturedAt) || capturedAt < previousTime || capturedAt - previousTime > 10_000 || capturedAt > expiresAt) {
      return { valid: false, reason: "INVALID_TIMING" };
    }
    const gestures = Array.isArray(item.gestures) ? item.gestures : [];
    if (!gestures.some((gesture) => acceptedGestures[challenge].has(gesture))) {
      return { valid: false, reason: "GESTURE_NOT_DETECTED" };
    }
    const real = Number(item.real);
    const live = Number(item.live);
    if (!Number.isFinite(real) || !Number.isFinite(live) || real < 0.65 || live < 0.55) {
      return { valid: false, reason: "PASSIVE_LIVENESS_FAILED" };
    }
    score = Math.min(score, real, live);
    previousTime = capturedAt;
  }

  return { valid: true, score };
}
