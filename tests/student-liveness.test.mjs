import assert from "node:assert/strict";
import test from "node:test";
import { validateLivenessEvidence } from "../src/lib/liveness-rules.mjs";

const issuedAt = 1_000_000;
const expiresAt = issuedAt + 30_000;
const validEvidence = [
  { challenge: "BLINK", gestures: ["blink left eye"], real: 0.91, live: 0.88, capturedAt: issuedAt + 2_000 },
  { challenge: "TURN_LEFT", gestures: ["facing left"], real: 0.89, live: 0.82, capturedAt: issuedAt + 5_000 },
  { challenge: "LOOK_UP", gestures: ["head up"], real: 0.86, live: 0.80, capturedAt: issuedAt + 8_000 },
];

test("interactive liveness accepts the issued challenges in order", () => {
  const result = validateLivenessEvidence({
    expected: ["BLINK", "TURN_LEFT", "LOOK_UP"], evidence: validEvidence, issuedAt, expiresAt, now: issuedAt + 9_000,
  });
  assert.equal(result.valid, true);
  assert.equal(result.score, 0.80);
});

test("interactive liveness rejects incomplete, reordered, expired, and low-passive evidence", () => {
  assert.equal(validateLivenessEvidence({ expected: ["BLINK", "TURN_LEFT", "LOOK_UP"], evidence: [], issuedAt, expiresAt, now: issuedAt }).reason, "MISSING_EVIDENCE");
  assert.equal(validateLivenessEvidence({ expected: ["TURN_LEFT", "BLINK", "LOOK_UP"], evidence: validEvidence, issuedAt, expiresAt, now: issuedAt + 9_000 }).reason, "CHALLENGE_MISMATCH");
  assert.equal(validateLivenessEvidence({ expected: ["BLINK", "TURN_LEFT", "LOOK_UP"], evidence: validEvidence, issuedAt, expiresAt, now: expiresAt + 1 }).reason, "CHALLENGE_EXPIRED");
  assert.equal(validateLivenessEvidence({ expected: ["BLINK", "BLINK", "LOOK_UP"], evidence: validEvidence, issuedAt, expiresAt, now: issuedAt + 9_000 }).reason, "INVALID_CHALLENGE");
  const low = structuredClone(validEvidence);
  low[0].live = 0.2;
  assert.equal(validateLivenessEvidence({ expected: ["BLINK", "TURN_LEFT", "LOOK_UP"], evidence: low, issuedAt, expiresAt, now: issuedAt + 9_000 }).reason, "PASSIVE_LIVENESS_FAILED");
});

test("each challenge must complete within ten seconds", () => {
  const slow = structuredClone(validEvidence);
  slow[0].capturedAt = issuedAt + 10_001;
  assert.equal(validateLivenessEvidence({ expected: ["BLINK", "TURN_LEFT", "LOOK_UP"], evidence: slow, issuedAt, expiresAt, now: issuedAt + 11_000 }).reason, "INVALID_TIMING");
});
